import { Injectable, effect, inject, untracked } from '@angular/core';
import { BrowseService } from './browse.service';
import { PredictService } from '../routes/spongeffects/predict/service/predict.service';
import { BackendService } from './backend.service';
import { VersionsService } from './versions.service';
import { SpongEffectsService } from './spong-effects.service';
import { Dataset, GeneInteraction, GeneNode, NetworkData, TranscriptInteraction, TranscriptNode, InteractionSorting } from '../interfaces';
import { isEqual } from 'lodash';

interface PredictNetworkQuery {
  scope: string;
  dataset: Dataset;
  version: number;
  level: 'gene' | 'transcript';
  topModules: { gene: string; mean: number; moduleIndex: number }[];
  includeMembers: boolean;
  showOrphans: boolean;
  maxNodes: number;
  minDegree: number;
  minBetweenness: number;
  minEigen: number;
  sortingBetweenness: boolean;
  sortingEigenvector: boolean;
  sortingDegree: boolean;
  maxPValue: number;
  minMscor: number;
  geneType: string;
  supportFilter: 'all' | 'has_inverse' | 'no_inverse';
  interactionSorting: InteractionSorting;
  maxInteractions: number;
}

/**
 * Drives the "Compute SpongEffects Scores" patient-specific network from PredictService's
 * state, mirroring how ExploreBrowseService drives the Explore network from ExploreService.
 *
 * A spongEffects module is defined (see backend scripts/spongEffects/classify.py
 * `define_modules`) as a center gene plus its FIRST NEIGHBOURS in the ceRNA network. We render
 * that module as an INDUCED SUBGRAPH: the center, the members we display, and every ceRNA edge
 * among them — center<->member AND member<->member — but NO second neighbours.
 *
 * A module can have 1000+ members, which cannot all go in a GET URL, so we fetch in two steps:
 *   1. Rank every member by the mscor of its edge to the center, obtained via
 *      `ceRNAInteraction/findAll` on the center only. That call is edge-based, so only the
 *      center goes in the URL — no length ceiling even for huge modules.
 *   2. Take the strongest POOL_SIZE members and fetch the induced subgraph on
 *      {center + those members} via `getGeneNetwork`. Its induced-subgraph semantics return an
 *      edge only when BOTH endpoints are in the passed set, so member<->member edges are kept
 *      while any edge to a gene outside the module (a second neighbour) is dropped. The passed
 *      set is bounded by POOL_SIZE, so the URL stays well within limits.
 * Center-edge strength is the primary node ordering, so the max-node cap keeps the strongest
 * partners; display filters (mscor, min degree, orphans, max-node cap) are applied client-side
 * within the pool so the sliders stay instant.
 */
const POOL_SIZE = 100;
const moduleIDCache = new Map<string, number>();
const starEdgesCache = new Map<string, (GeneInteraction | TranscriptInteraction)[]>();
const inducedNetworkCache = new Map<string, { nodes: (GeneNode | TranscriptNode)[]; edges: (GeneInteraction | TranscriptInteraction)[] }>();


@Injectable()
export class PredictBrowseService extends BrowseService {
  predictService = inject(PredictService);
  private spongEffectsService = inject(SpongEffectsService);

  /** Module signature we've already auto-set the mscor / p-value slider bounds for (see autoAdjustFilterBounds). */
  private _autoBoundsSig: string | null = null;

  constructor() {
    super(inject(BackendService), inject(VersionsService));

    effect(() => {
      const scope = this.predictService.selectedScope$();
      const dataset = this.predictService.selectedScopeDataset$();
      const version = this.predictService.versionsService.versionReadOnly()();
      const level = this.predictService.level();
      const topModules = this.predictService.topModules$();
      const includeMembers = this.predictService.includeModuleMembers$();
      const showOrphans = this.predictService.showOrphans$();
      const maxNodes = this.predictService.maxNodes$();
      const minDegree = this.predictService.minDegree$();
      const minBetweenness = this.predictService.minBetweenness$();
      const minEigen = this.predictService.minEigen$();
      const sortingBetweenness = this.predictService.sortingBetweenness$();
      const sortingEigenvector = this.predictService.sortingEigenvector$();
      const sortingDegree = this.predictService.sortingDegree$();
      const maxPValue = this.predictService.maxPValue$();
      const minMscor = this.predictService.minMscor$();
      const geneType = this.predictService.geneType$();
      const supportFilter = this.predictService.supportFilter$();
      const interactionSorting = this.predictService.interactionSorting$();
      const maxInteractions = this.predictService.maxInteractions$();

      const newQuery: PredictNetworkQuery = {
        scope, dataset: dataset as Dataset, version, level, topModules,
        includeMembers, showOrphans, maxNodes, minDegree, minBetweenness, minEigen,
        sortingBetweenness, sortingEigenvector, sortingDegree,
        maxPValue, minMscor, geneType, supportFilter,
        interactionSorting: interactionSorting as InteractionSorting, maxInteractions,
      };

      untracked(() => {
        const oldQuery = this.getQuery() as unknown as PredictNetworkQuery | undefined;
        if (!isEqual(oldQuery, newQuery)) {
          this.runQuery(newQuery as any);
        }
      });
    });
  }

  override async fetchData(version: number, config: any): Promise<NetworkData> {
    const query = config as PredictNetworkQuery | undefined;
    if (!query) return { nodes: [], inverseNodes: [], edges: [], disease: undefined };
    const {
      scope, dataset, level, topModules, includeMembers, showOrphans, maxNodes, minDegree,
      minBetweenness, minEigen, sortingBetweenness, sortingEigenvector, sortingDegree,
      maxPValue, minMscor, interactionSorting, maxInteractions
    } = query;
    if (topModules.length === 0 || !dataset || !version) {
      return { nodes: [], inverseNodes: [], edges: [], disease: dataset };
    }

    const centerIDs = new Set<string>(topModules.map((m) => m.gene));

    // 1. Resolve the stored member gene IDs of each center's module.
    const memberIDs = new Set<string>();
    const dbModuleMembers: Record<string, string[]> = {};
    const prediction = this.predictService.prediction$();
    if (includeMembers) {
      const localScopeMembers = (prediction as any)?.module_members?.[scope];
      if (localScopeMembers) {
        for (const center of centerIDs) {
          const members = localScopeMembers[center];
          if (members && Array.isArray(members)) {
            members.forEach((m: string) => {
              if (m && m !== center) memberIDs.add(m);
            });
          }
        }
      } else {
        try {
          await Promise.all(
            topModules.map(async (m) => {
              const center = m.gene;
              const moduleId = await this.resolveModuleId(center, version, scope, level);
              if (moduleId !== undefined) {
                const members = await this.resolveModuleMembers(moduleId, version, scope, level);
                const mIds: string[] = [];
                members.forEach((mem: { gene?: { ensg_number: string }; transcript?: { enst_number: string } }) => {
                  const id = mem.gene?.ensg_number ?? mem.transcript?.enst_number;
                  if (id && id !== center) {
                    memberIDs.add(id);
                    mIds.push(id);
                  }
                });
                dbModuleMembers[center] = mIds;
              }
            })
          );
        } catch (e) {
          console.error('Error resolving module members from DB:', e);
        }
      }
    }

    // 2. Select which members to display by center-edge strength, then fetch the induced
    //    subgraph on {centers + those members}.
    const memberMscor = new Map<string, number>();
    let poolIDs = new Set<string>();

    if (includeMembers && memberIDs.size > 0) {
      // 2a. Rank members by the mscor of their edge to a center, fetched via findAll on the
      //     center(s) only (edge-based, so members never enter the URL — no length ceiling).
      const starKey = `${level}_${dataset.dataset_ID}_${version}_${Array.from(centerIDs).sort().join(',')}`;
      let starEdges = starEdgesCache.get(starKey);
      if (!starEdges) {
        try {
          // Fetch the full p-value range (1); ranking is by mscor and p is filtered client-side.
          starEdges = level === 'gene'
            ? await this.backend.getGeneInteractionsAll(version, dataset, 1, Array.from(centerIDs))
            : await this.backend.getTranscriptInteractionsAll(version, dataset, 1, Array.from(centerIDs));
        } catch (e) {
          console.error('Error ranking module members by center-edge strength:', e);
          starEdges = [];
        }
        starEdgesCache.set(starKey, starEdges);
      }

      for (const int of starEdges as any[]) {
        const [aID, bID] = 'gene1' in int
          ? [int.gene1.ensg_number, int.gene2.ensg_number]
          : [int.transcript_1.enst_number, int.transcript_2.enst_number];
        const neighbour = centerIDs.has(aID) ? bID : centerIDs.has(bID) ? aID : undefined;
        if (!neighbour || !memberIDs.has(neighbour)) continue;
        const mscorVal = typeof int.mscor === 'number' ? int.mscor : parseFloat(int.mscor) || 0;
        memberMscor.set(neighbour, Math.max(memberMscor.get(neighbour) ?? -Infinity, mscorVal));
      }

      // Buffer the pool beyond the display cap so the max-node slider stays client-side.
      const poolCount = Math.min(memberIDs.size, Math.max(POOL_SIZE, maxNodes));
      poolIDs = new Set(
        Array.from(memberIDs)
          .sort((a, b) => (memberMscor.get(b) ?? -Infinity) - (memberMscor.get(a) ?? -Infinity))
          .slice(0, poolCount)
      );
    }

    const allIDs = new Set<string>([...centerIDs, ...poolIDs]);

    // 2b. Fetch the induced subgraph on {centers + pool}. getGeneNetwork returns an edge only
    //     when both endpoints are in the passed set, so this yields center<->member AND
    //     member<->member edges with no second neighbours (cached; mscor + p-value filtered
    //     client-side, so the cache key does NOT depend on those sliders).
    let networkNodes: (GeneNode | TranscriptNode)[] = [];
    let networkEdges: (GeneInteraction | TranscriptInteraction)[] = [];
    const cacheKey = `${level}_${dataset.dataset_ID}_${version}_${scope}_${Array.from(allIDs).sort().join(',')}`;

    if (inducedNetworkCache.has(cacheKey)) {
      const cached = inducedNetworkCache.get(cacheKey)!;
      networkNodes = cached.nodes;
      networkEdges = cached.edges;
    } else {
      try {
        const browseQuery = {
          level,
          dataset,
          ensemblID: Array.from(allIDs),
          showOrphans: true,
          sortingDegree,
          sortingEigenvector,
          sortingBetweenness,
          minDegree: 0,
          minBetweenness: 0,
          minEigen: 0,
          maxPValue: 1, // fetch the full p-value range; p + mscor are filtered client-side
          minMscor: 0, // fetch all edges; mscor filtering is applied client-side for instant sliders
          maxNodes: allIDs.size + 10,
          maxInteractions: 50000,
          interactionSorting: interactionSorting
        };

        const result = await this.backend.getNetwork(version, browseQuery);
        networkNodes = result.nodes || [];
        networkEdges = result.edges || [];
        inducedNetworkCache.set(cacheKey, { nodes: networkNodes, edges: networkEdges });
      } catch (e) {
        console.error('Error fetching patient specific network from backend:', e);
        return { nodes: [], inverseNodes: [], edges: [], disease: dataset };
      }
    }

    // 3. Populate node map from the backend response (with real DB centralities!)
    const nodeMap = new Map<string, GeneNode | TranscriptNode>();
    for (const n of networkNodes) {
      const id = BrowseService.getNodeID(n);
      if (allIDs.has(id)) {
        nodeMap.set(id, n);
      }
    }

    // 3b. Fetch missing node metadata from the database directly so that
    // nodes missing from the backend node response get their real type and symbol.
    const missingIDs = Array.from(allIDs).filter(id => !nodeMap.has(id));
    const edgeMeta = new Map<string, { symbol?: string; geneType?: string; transcriptType?: string }>();
    if (missingIDs.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < missingIDs.length; i += chunkSize) {
        const chunk = missingIDs.slice(i, i + chunkSize);
        try {
          if (level === 'gene') {
            const info = await this.backend.getGeneInfo(version, chunk.join(','));
            if (info && Array.isArray(info)) {
              for (const item of info) {
                edgeMeta.set(item.ensg_number, {
                  symbol: item.gene_symbol,
                  geneType: item.gene_type
                });
              }
            }
          } else {
            const info = await this.backend.getTranscriptInfo(version, chunk.join(','));
            if (info && Array.isArray(info)) {
              for (const item of info as any[]) {
                edgeMeta.set(item.enst_number, {
                  symbol: item.gene?.gene_symbol || item.enst_number,
                  geneType: item.gene?.gene_type || 'unknown',
                  transcriptType: item.transcript_type
                });
              }
            }
          }
        } catch (e) {
          console.error('Error fetching missing node metadata:', e);
        }
      }
    }

    // For any IDs (centers or members) not returned by the database, create a bare node
    for (const id of allIDs) {
      if (!nodeMap.has(id)) {
        const meta = edgeMeta.get(id);
        nodeMap.set(id, this.minimalNode(id, level, dataset, centerIDs.has(id), meta?.symbol, meta?.geneType, meta?.transcriptType));
      }
    }

    // 4. Keep the star edges: a center connected to one of its stored members
    const keptEdges: (GeneInteraction | TranscriptInteraction)[] = [];

    const wanted = (id: string) => centerIDs.has(id) || (includeMembers && poolIDs.has(id));

    for (const int of networkEdges as any[]) {
      const mscorVal = typeof int.mscor === 'number' ? int.mscor : parseFloat(int.mscor) || 0;
      if (mscorVal < minMscor) continue;
      // p-value is filtered client-side too (we always fetch the full range) so the slider is
      // instant and auto-adjusting it never refetches. Non-numeric p-values are kept.
      const pVal = typeof int.p_value === 'number' ? int.p_value : parseFloat(int.p_value);
      if (Number.isFinite(pVal) && pVal > maxPValue) continue;
      const [aID, bID] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];

      if (!wanted(aID) || !wanted(bID)) continue;
      keptEdges.push(int);
    }

    // 5. Add virtual star edges for pool members that the DB has no center edge for (the
    //    models.RDS training network defines them as first neighbours but the DB interaction
    //    table lacks the edge). Restricted to the pool so we never synthesise off-screen members.
    //    These synthetic edges carry no real mscor / p-value, so any active cutoff must drop them
    //    — only synthesise in the fully-unfiltered state (minMscor 0 AND maxPValue 1).
    if (includeMembers && minMscor <= 0 && maxPValue >= 1) {
      const localScopeMembers = (prediction as any)?.module_members?.[scope];
      const scopeMembers = localScopeMembers || dbModuleMembers;
      for (const center of centerIDs) {
        const members = scopeMembers ? scopeMembers[center] : undefined;
        if (members && Array.isArray(members)) {
          members.forEach((m: string) => {
            if (!m || m === center || !poolIDs.has(m)) return;

            // Check if we already have an edge between center and m
            const hasEdge = keptEdges.some((int: any) => {
              const [aID, bID] = 'gene1' in int
                ? [int.gene1.ensg_number, int.gene2.ensg_number]
                : [int.transcript_1.enst_number, int.transcript_2.enst_number];
              return (aID === center && bID === m) || (aID === m && bID === center);
            });

            if (!hasEdge) {
              const centerNode = nodeMap.get(center) as any;
              const memberNode = nodeMap.get(m) as any;
              const centerSymbol = centerNode?.gene?.gene_symbol || centerNode?.transcript?.gene?.gene_symbol || edgeMeta.get(center)?.symbol || center;
              const memberSymbol = memberNode?.gene?.gene_symbol || memberNode?.transcript?.gene?.gene_symbol || edgeMeta.get(m)?.symbol || m;
              const virtualEdge = this.createVirtualEdge(center, m, level, dataset, centerSymbol, memberSymbol);
              keptEdges.push(virtualEdge);
            }
          });
        }
      }
    }

    // Always include the center node(s), even if isolated.
    for (const m of topModules) {
      if (!nodeMap.has(m.gene)) {
        const meta = edgeMeta.get(m.gene);
        nodeMap.set(m.gene, this.minimalNode(m.gene, level, dataset, true, meta?.symbol, meta?.geneType, meta?.transcriptType));
      }
    }

    // 6. Map nodes with isCenter + center-edge strength (used for sorting).
    let nodes = Array.from(nodeMap.values()).map((n) => {
      const id = BrowseService.getNodeID(n);
      return {
        ...n,
        node_degree: n.node_degree ?? null,
        isCenter: centerIDs.has(id),
        centerMscor: memberMscor.get(id) ?? -Infinity,
      } as any;
    });

    const geneTypeFilter = this.predictService.geneType$();
    const supportFilter = this.predictService.supportFilter$();

    // Node filters apply to ALL nodes, centers included — centers are never force-kept.
    nodes = nodes.filter((n) => {
      const degreeOk = (n.node_degree ?? 0) >= minDegree;
      const betweennessOk = minBetweenness === 0 || (n.betweenness !== null && n.betweenness !== undefined && n.betweenness >= minBetweenness);
      const eigenOk = minEigen === 0 || (n.eigenvector !== null && n.eigenvector !== undefined && n.eigenvector >= minEigen);
      if (!degreeOk || !betweennessOk || !eigenOk) return false;

      if (geneTypeFilter && geneTypeFilter !== 'all') {
        let nType = '';
        if ('gene' in n && n.gene?.gene_type) nType = n.gene.gene_type;
        else if ('transcript' in n && n.transcript?.transcript_type) nType = n.transcript.transcript_type;
        else if ('transcript' in n && n.transcript?.gene?.gene_type) nType = n.transcript.gene.gene_type;
        if (nType.toLowerCase() !== geneTypeFilter.toLowerCase()) return false;
      }

      if (supportFilter && supportFilter !== 'all') {
        // Cross-level support (has_inverse) comes from the network_analysis_gene/transcript row and
        // is only meaningful for nodes backed by a real DB row. Synthetic/minimal nodes have an
        // unknown status (has_inverse null/undefined) — show them only when not filtering support.
        if (n.has_inverse === null || n.has_inverse === undefined) return false;
        const hasInv = Boolean(n.has_inverse);
        if (supportFilter === 'has_inverse' && !hasInv) return false;
        if (supportFilter === 'no_inverse' && hasInv) return false;
      }

      return true;
    });

    // Sort: centers first (module anchors), then by center-edge strength; the centrality toggles
    // order within equal strength. A single cap then applies to everyone — centers included, so
    // they are never force-kept past the max-node limit.
    nodes.sort((a, b) => {
      if (a.isCenter !== b.isCenter) return a.isCenter ? -1 : 1;
      if (a.centerMscor !== b.centerMscor) return b.centerMscor - a.centerMscor;
      if (sortingBetweenness) {
        const valA = a.betweenness ?? -1;
        const valB = b.betweenness ?? -1;
        if (valA !== valB) return valB - valA;
      }
      if (sortingEigenvector) {
        const valA = a.eigenvector ?? -1;
        const valB = b.eigenvector ?? -1;
        if (valA !== valB) return valB - valA;
      }
      if (sortingDegree) {
        const valA = a.node_degree ?? 0;
        const valB = b.node_degree ?? 0;
        if (valA !== valB) return valB - valA;
      }
      return (b.node_degree ?? 0) - (a.node_degree ?? 0);
    });

    nodes = nodes.slice(0, Math.max(0, maxNodes));

    // 7. Keep edges among the surviving nodes, then sort + cap by the interaction controls
    //    (maxInteractions / interactionSorting) — previously these had no effect here.
    const finalIDs = new Set(nodes.map((n) => BrowseService.getNodeID(n)));
    let edges = keptEdges.filter((int: any) => {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      return finalIDs.has(a) && finalIDs.has(b);
    });

    const parseEdgeNum = (v: any) => {
      const f = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(f) ? f : null;
    };
    const sortKey = (interactionSorting || '').toString().toLowerCase();
    const edgeField = sortKey.includes('scor') ? 'mscor' : sortKey.includes('correl') ? 'correlation' : 'p_value';
    const edgeAsc = edgeField === 'p_value';
    (edges as any[]).sort((e1, e2) => {
      const va = parseEdgeNum(e1[edgeField]);
      const vb = parseEdgeNum(e2[edgeField]);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // synthetic / non-numeric edges sort last
      if (vb === null) return -1;
      return edgeAsc ? va - vb : vb - va;
    });

    if (typeof maxInteractions === 'number' && maxInteractions >= 0) {
      edges = edges.slice(0, maxInteractions);
    }

    // 8. Orphan pass LAST, over the FINAL edge set — a node stranded by ANY filter (support,
    //    gene-type, centrality, the max-node cap, or the max-interaction cap) is hidden when
    //    "Show orphans" is off. Centers are treated like every other node.
    if (!showOrphans) {
      const connected = new Set<string>();
      for (const int of edges as any[]) {
        const [a, b] = 'gene1' in int
          ? [int.gene1.ensg_number, int.gene2.ensg_number]
          : [int.transcript_1.enst_number, int.transcript_2.enst_number];
        connected.add(a);
        connected.add(b);
      }
      nodes = nodes.filter((n) => connected.has(BrowseService.getNodeID(n)));
    }

    this.autoAdjustFilterBounds(query, edges as any[]);

    return { nodes, inverseNodes: [], edges, disease: dataset };
  }

  /**
   * On a fresh module network, start unfiltered (maxPValue 1 / minMscor 0) and then snap the
   * two sliders to the actual bounds of the displayed edges, so the user sees the real range and
   * can only tighten from there. Runs once per module signature (scope / dataset / level /
   * modules / includeMembers); user edits afterwards are left alone. When synthetic (virtual)
   * edges are present the network is only meaningful fully-unfiltered, so both sliders are kept
   * at their extremes (0 / 1) in that case.
   */
  private autoAdjustFilterBounds(query: any, edges: any[]): void {
    const sig = [
      query.scope, query.dataset?.dataset_ID, query.level, query.includeMembers,
      (query.topModules ?? []).map((m: any) => m.gene).sort().join(','),
    ].join('|');
    const atUnfiltered = (query.maxPValue ?? 1) >= 1 && (query.minMscor ?? 0) <= 0;

    untracked(() => {
      if (sig === this._autoBoundsSig) return; // already handled this module — leave the user's edits

      if (!atUnfiltered) {
        // Signals still carry the previous module's tightened values — reset to unfiltered. The
        // resulting rebuild re-enters here at the unfiltered state, where the bounds are computed.
        if (this.predictService.maxPValue$() !== 1) this.predictService.maxPValue$.set(1);
        if (this.predictService.minMscor$() !== 0) this.predictService.minMscor$.set(0);
        return;
      }

      this._autoBoundsSig = sig; // unfiltered edges for this module in hand — compute exactly once
      const real = edges.filter((e) => !e.isVirtual);
      // Keep 0 / 1 when synthetic edges are present (or there are no real edges to bound).
      if (real.length === 0 || real.length !== edges.length) return;

      let minM = Infinity;
      let maxP = -Infinity;
      for (const e of real) {
        const m = typeof e.mscor === 'number' ? e.mscor : parseFloat(e.mscor);
        const p = typeof e.p_value === 'number' ? e.p_value : parseFloat(e.p_value);
        if (Number.isFinite(m)) minM = Math.min(minM, m);
        if (Number.isFinite(p)) maxP = Math.max(maxP, p);
      }
      if (Number.isFinite(minM)) this.predictService.minMscor$.set(minM);
      if (Number.isFinite(maxP)) this.predictService.maxPValue$.set(maxP);
    });
  }

  /** Build a network node from a ceRNA-edge endpoint (which carries symbol + type). */
  private nodeFromEdgeEndpoint(g: any, level: 'gene' | 'transcript', dataset: Dataset, centerIDs: Set<string>): GeneNode | TranscriptNode {
    const spongeRun = {
      dataset: { data_origin: '', dataset_ID: dataset.dataset_ID, disease_name: dataset.disease_name, disease_subtype: '' },
      sponge_run_ID: 0,
    };
    if (level === 'gene') {
      return {
        gene: { ensg_number: g.ensg_number, gene_symbol: g.gene_symbol || g.ensg_number, gene_type: g.gene_type || 'unknown' },
        betweenness: null, eigenvector: null, node_degree: null, sponge_run: spongeRun,
      } as GeneNode;
    }
    return {
      transcript: {
        enst_number: g.enst_number,
        gene: g.gene ?? { ensg_number: g.enst_number, gene_symbol: g.enst_number, gene_type: 'unknown' },
        transcript_type: g.transcript_type || 'unknown',
      },
      betweenness: null, eigenvector: null, node_degree: null, sponge_run: spongeRun,
    } as TranscriptNode;
  }

  /** Build a bare node for a gene we have no edge data for (isolated center or orphan member). */
  private minimalNode(id: string, level: 'gene' | 'transcript', dataset: Dataset, isCenter: boolean, symbol?: string, geneType?: string, transcriptType?: string): GeneNode | TranscriptNode {
    const spongeRun = {
      dataset: { data_origin: '', dataset_ID: dataset.dataset_ID, disease_name: dataset.disease_name, disease_subtype: '' },
      sponge_run_ID: 0,
    };
    if (level === 'gene') {
      return {
        gene: { ensg_number: id, gene_symbol: symbol || id, gene_type: geneType || 'unknown' },
        betweenness: null, eigenvector: null, node_degree: null, sponge_run: spongeRun,
      } as GeneNode;
    }
    return {
      transcript: { enst_number: id, gene: { ensg_number: id, gene_symbol: symbol || id, gene_type: geneType || 'unknown' }, transcript_type: transcriptType || 'unknown' },
      betweenness: null, eigenvector: null, node_degree: null, sponge_run: spongeRun,
    } as TranscriptNode;
  }

  protected createVirtualEdge(center: string, member: string, level: 'gene' | 'transcript', dataset: Dataset, centerSymbol?: string, memberSymbol?: string): any {
    const spongeRun = {
      dataset: { data_origin: '', dataset_ID: dataset.dataset_ID, disease_name: dataset.disease_name, disease_subtype: '' },
      sponge_run_ID: 0,
    };
    const cSym = centerSymbol || center;
    const mSym = memberSymbol || member;
    if (level === 'gene') {
      return {
        correlation: '(abs) > 0.1',
        mscor: '< 0.2',
        p_value: '> 0.2',
        isVirtual: true,
        gene1: { ensg_number: center, gene_symbol: cSym, gene_type: 'unknown' },
        gene2: { ensg_number: member, gene_symbol: mSym, gene_type: 'unknown' },
        sponge_run: spongeRun
      } as any;
    } else {
      return {
        correlation: '(abs) > 0.1',
        mscor: '< 0.2',
        p_value: '> 0.2',
        isVirtual: true,
        transcript_1: { enst_number: center, gene: { ensg_number: center, gene_symbol: cSym, gene_type: 'unknown' }, transcript_type: 'unknown' },
        transcript_2: { enst_number: member, gene: { ensg_number: member, gene_symbol: mSym, gene_type: 'unknown' }, transcript_type: 'unknown' },
        sponge_run: spongeRun
      } as any;
    }
  }

  private async resolveModuleId(
    gene: string, version: number, scope: string, level: 'gene' | 'transcript',
  ): Promise<number | undefined> {
    const cacheKey = `${gene}_${version}_${scope}_${level}`;
    if (moduleIDCache.has(cacheKey)) return moduleIDCache.get(cacheKey);

    let moduleId: number | undefined;
    if (level === 'gene') {
      const modules = await this.backend.getSpongEffectsGeneModules(version, scope, undefined, undefined, gene);
      moduleId = modules[0]?.spongEffects_gene_module_ID;
    } else {
      const modules = await this.backend.getSpongEffectsTranscriptModules(version, scope, undefined, undefined, gene);
      moduleId = modules[0]?.spongEffects_transcript_module_ID;
    }
    if (moduleId !== undefined) moduleIDCache.set(cacheKey, moduleId);
    return moduleId;
  }

  private async resolveModuleMembers(
    id: number, version: number, scope: string, level: 'gene' | 'transcript',
  ): Promise<any[]> {
    // Routed through the shared cache so the network reuses members already fetched by the
    // module tables / importance plot for the same module (and vice versa).
    return level === 'gene'
      ? this.spongEffectsService.getGeneModuleMembers(version, scope, { moduleId: id })
      : this.spongEffectsService.getTranscriptModuleMembers(version, scope, { moduleId: id });
  }
}

async function runWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const executing = new Set<Promise<any>>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const p = (async () => {
      results[i] = await fn(item);
    })();

    executing.add(p);
    p.then(() => executing.delete(p));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
