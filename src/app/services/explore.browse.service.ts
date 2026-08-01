import { Injectable, effect, inject, untracked } from '@angular/core';
import { BrowseService } from './browse.service';
import { ExploreService } from '../routes/spongeffects/explore/service/explore.service';
import { Dataset, GeneNode, TranscriptNode, GeneInteraction, TranscriptInteraction, NetworkData, InteractionSorting } from '../interfaces';
import { BackendService } from './backend.service';
import { VersionsService } from './versions.service';
import { isEqual } from 'lodash';

// Buffer the working pool beyond the display cap so the max-node slider stays client-side, and
// so the getGeneNetwork URL/payload never scales with huge (1000+ member) modules. Mirrors the
// patient-specific network.
const POOL_SIZE = 100;
const exploreStarEdgesCache = new Map<string, (GeneInteraction | TranscriptInteraction)[]>();
const exploreInducedCache = new Map<string, { nodes: (GeneNode | TranscriptNode)[]; edges: (GeneInteraction | TranscriptInteraction)[] }>();

@Injectable()
export class ExploreBrowseService extends BrowseService {
  exploreService = inject(ExploreService);
  disease = this.exploreService.selectedDisease$();


  constructor() {
    // Pass the required arguments to the parent BrowseService constructor
    super(
      inject(BackendService),
      inject(VersionsService)
    );

    // Drive the Explore reference network entirely from ExploreService state — the module
    // selection plus the shared <app-network-filters> signals. (Previously the network-filter
    // half of this query came from <app-form>; it now lives on ExploreService.)
    effect(() => {
      const es = this.exploreService;
      const newQuery = {
        dataset: es.selectedDiseaseObject$(),
        level: es.level$(),
        ensemblID: es.selectedModules.value()?.map((m: any) => m.ensemblID) ?? [],
        // Tracked so toggling "Show module members" rebuilds the network (fetchData reads the
        // signal to add member nodes). Without this the checkbox had no visible effect.
        includeMembers: es.includeModuleMembers(),
        showOrphans: es.showOrphans$(),
        sortingBetweenness: es.sortingBetweenness$(),
        sortingEigenvector: es.sortingEigenvector$(),
        sortingDegree: es.sortingDegree$(),
        maxNodes: es.maxNodes$(),
        minDegree: es.minDegree$(),
        minBetweenness: es.minBetweenness$(),
        minEigen: es.minEigen$(),
        maxPValue: es.maxPValue$(),
        minMscor: es.minMscor$(),
        interactionSorting: es.interactionSorting$() as InteractionSorting,
        maxInteractions: es.maxInteractions$(),
        geneType: es.geneType$(),
        supportFilter: es.supportFilter$(),
      };

      untracked(() => {
        if (!isEqual(this.getQuery(), newQuery)) {
          this.runQuery(newQuery);
        }
      });
    });
  }

  override async fetchData(
    version: number,
    config: any // Use the correct type for your BrowseQuery
  ): Promise<NetworkData> {
    const es = this.exploreService;
    const selectedModules = es.selectedModules.value() ?? [];
    const dataset = es.selectedDiseaseObject$();
    if (selectedModules.length === 0 || !dataset || !version) {
      return { nodes: [], inverseNodes: [], edges: [], disease: dataset };
    }

    const level = es.level$();
    const includeMembers = es.includeModuleMembers();

    // Display filters — all applied client-side (see critical_project_info §9).
    const minDegree = es.minDegree$();
    const minBetweenness = es.minBetweenness$();
    const minEigen = es.minEigen$();
    const minMscor = es.minMscor$();
    const maxPValue = es.maxPValue$();
    const maxNodes = es.maxNodes$();
    const maxInteractions = es.maxInteractions$();
    const interactionSorting = es.interactionSorting$();
    const geneTypeFilter = es.geneType$();
    const supportFilter = es.supportFilter$();
    const showOrphans = es.showOrphans$();
    const sortingBetweenness = es.sortingBetweenness$();
    const sortingEigenvector = es.sortingEigenvector$();
    const sortingDegree = es.sortingDegree$();

    const centerIDs = new Set<string>(selectedModules.map((m: any) => m.ensemblID));
    const parseNum = (v: any) => { const f = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(f) ? f : null; };

    // 1. Module members, fetched per module by module ID. Build center->members + the full set.
    const centerToMembers = new Map<string, string[]>();
    const memberIDs = new Set<string>();
    if (includeMembers) {
      const toFetch = selectedModules.filter((m: any) => !es.moduleMembersMap.has(es.getModuleKey(m)));
      await Promise.all(toFetch.map((m: any) => es.fetchModuleMembers(m)));
      for (const module of selectedModules as any[]) {
        const members = (es.moduleMembersMap.get(es.getModuleKey(module)) || [])
          .map((mm: any) => mm.ensemblID)
          .filter((id: string) => id && id !== module.ensemblID);
        centerToMembers.set(module.ensemblID, members);
        for (const id of members) memberIDs.add(id);
      }
    }

    // 2. Rank members by their center-edge mscor via findAll on the center(s) only (edge-based, so
    //    members never enter the URL), then keep the strongest POOL_SIZE as the working pool. This
    //    bounds the getGeneNetwork request and prioritises center-connected members. Same two-step
    //    approach as the patient-specific network.
    const memberMscor = new Map<string, number>();
    let poolIDs = new Set<string>();
    if (includeMembers && memberIDs.size > 0) {
      const starKey = `${level}_${dataset.dataset_ID}_${version}_${Array.from(centerIDs).sort().join(',')}`;
      let starEdges = exploreStarEdgesCache.get(starKey);
      if (!starEdges) {
        try {
          starEdges = level === 'gene'
            ? await this.backend.getGeneInteractionsAll(version, dataset, 1, Array.from(centerIDs))
            : await this.backend.getTranscriptInteractionsAll(version, dataset, 1, Array.from(centerIDs));
        } catch (e) {
          console.error('Error ranking explore module members by center-edge strength:', e);
          starEdges = [];
        }
        exploreStarEdgesCache.set(starKey, starEdges);
      }
      for (const int of starEdges as any[]) {
        const [aID, bID] = 'gene1' in int
          ? [int.gene1.ensg_number, int.gene2.ensg_number]
          : [int.transcript_1.enst_number, int.transcript_2.enst_number];
        const neighbour = centerIDs.has(aID) ? bID : centerIDs.has(bID) ? aID : undefined;
        if (!neighbour || !memberIDs.has(neighbour)) continue;
        const mscorVal = parseNum(int.mscor) ?? 0;
        memberMscor.set(neighbour, Math.max(memberMscor.get(neighbour) ?? -Infinity, mscorVal));
      }
      const poolCount = Math.min(memberIDs.size, Math.max(POOL_SIZE, maxNodes || 0));
      poolIDs = new Set(
        Array.from(memberIDs)
          .sort((a, b) => (memberMscor.get(b) ?? -Infinity) - (memberMscor.get(a) ?? -Infinity))
          .slice(0, poolCount)
      );
    }

    const allIDs = new Set<string>([...centerIDs, ...poolIDs]);

    // 3. Fetch the FULL induced subgraph on {centers + pool}, UNFILTERED (every display filter is
    //    applied client-side below). Cache key excludes the sliders so they stay instant.
    let rawNodes: (GeneNode | TranscriptNode)[] = [];
    let rawEdges: (GeneInteraction | TranscriptInteraction)[] = [];
    const cacheKey = `${level}_${dataset.dataset_ID}_${version}_${Array.from(allIDs).sort().join(',')}`;
    if (exploreInducedCache.has(cacheKey)) {
      const cached = exploreInducedCache.get(cacheKey)!;
      rawNodes = cached.nodes;
      rawEdges = cached.edges;
    } else {
      try {
        const result = await this.backend.getNetwork(version, {
          level, dataset, ensemblID: Array.from(allIDs),
          showOrphans: true, sortingDegree, sortingEigenvector, sortingBetweenness,
          minDegree: 0, minBetweenness: 0, minEigen: 0, maxPValue: 1, minMscor: 0,
          maxNodes: allIDs.size + 10, maxInteractions: 50000, interactionSorting,
        } as any);
        rawNodes = result.nodes || [];
        rawEdges = result.edges || [];
        exploreInducedCache.set(cacheKey, { nodes: rawNodes, edges: rawEdges });
      } catch (e) {
        console.error('Error fetching explore network:', e);
        return { nodes: [], inverseNodes: [], edges: [], disease: dataset };
      }
    }

    // 4. Node map (restricted to allIDs), tag isCenter; bare-node fallback for any missing id.
    const nodeMap = new Map<string, any>();
    for (const n of rawNodes) {
      const id = BrowseService.getNodeID(n);
      if (allIDs.has(id)) nodeMap.set(id, n);
    }
    for (const id of allIDs) {
      if (!nodeMap.has(id)) nodeMap.set(id, this.bareNode(id, level, dataset));
    }
    let nodes: any[] = Array.from(nodeMap.values()).map((n: any) => ({
      ...n, node_degree: n.node_degree ?? null, isCenter: centerIDs.has(BrowseService.getNodeID(n)),
    }));

    // 5. Keep real edges among {centers + pool} passing the mscor / p-value cutoffs.
    const wanted = (id: string) => centerIDs.has(id) || poolIDs.has(id);
    const keptEdges: any[] = [];
    for (const int of rawEdges as any[]) {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      if (!wanted(a) || !wanted(b)) continue;
      const mscor = parseNum(int.mscor);
      if (mscor !== null && mscor < minMscor) continue;
      const p = parseNum(int.p_value);
      if (p !== null && p > maxPValue) continue;
      keptEdges.push(int);
    }

    // 6. Virtual center<->member fallback edges for pool members the DB has no real center edge for
    //    (a spongEffects module member does NOT always have a DB edge — see §2/§9). Only in the
    //    fully-unfiltered state (minMscor 0 && maxPValue 1); rendered thin. Same as predict.
    if (includeMembers && minMscor <= 0 && maxPValue >= 1) {
      for (const [center, members] of centerToMembers) {
        if (!centerIDs.has(center)) continue;
        for (const m of members) {
          if (!poolIDs.has(m)) continue;
          const hasEdge = keptEdges.some((int: any) => {
            const [a, b] = 'gene1' in int
              ? [int.gene1.ensg_number, int.gene2.ensg_number]
              : [int.transcript_1.enst_number, int.transcript_2.enst_number];
            return (a === center && b === m) || (a === m && b === center);
          });
          if (!hasEdge) {
            const cNode = nodeMap.get(center);
            const mNode = nodeMap.get(m);
            const cSym = cNode?.gene?.gene_symbol || cNode?.transcript?.gene?.gene_symbol || center;
            const mSym = mNode?.gene?.gene_symbol || mNode?.transcript?.gene?.gene_symbol || m;
            keptEdges.push(this.createVirtualEdge(center, m, level, dataset, cSym, mSym));
          }
        }
      }
    }

    // 7. Node filters (all nodes; a 0 threshold passes through, incl. null-metric nodes).
    nodes = nodes.filter((n: any) => {
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
        if (n.has_inverse === null || n.has_inverse === undefined) return false;
        const hasInv = Boolean(n.has_inverse);
        if (supportFilter === 'has_inverse' && !hasInv) return false;
        if (supportFilter === 'no_inverse' && hasInv) return false;
      }
      return true;
    });

    // 8. Sort centers first (so "Max module centers" governs the visible modules), then by
    //    center-edge strength (keeps connected members under the cap), then the centrality toggles.
    nodes.sort((a: any, b: any) => {
      if (a.isCenter !== b.isCenter) return a.isCenter ? -1 : 1;
      const am = memberMscor.get(BrowseService.getNodeID(a)) ?? -Infinity;
      const bm = memberMscor.get(BrowseService.getNodeID(b)) ?? -Infinity;
      if (am !== bm) return bm - am;
      if (sortingBetweenness) { const x = a.betweenness ?? -1, y = b.betweenness ?? -1; if (x !== y) return y - x; }
      if (sortingEigenvector) { const x = a.eigenvector ?? -1, y = b.eigenvector ?? -1; if (x !== y) return y - x; }
      if (sortingDegree) { const x = a.node_degree ?? 0, y = b.node_degree ?? 0; if (x !== y) return y - x; }
      return (b.node_degree ?? 0) - (a.node_degree ?? 0);
    });
    if (typeof maxNodes === 'number' && !isNaN(maxNodes)) {
      nodes = nodes.slice(0, Math.max(0, maxNodes));
    }

    // 9. Edges among the surviving nodes, sorted + capped by the interaction controls.
    const finalIDs = new Set(nodes.map((n: any) => BrowseService.getNodeID(n)));
    let edges = keptEdges.filter((int: any) => {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      return finalIDs.has(a) && finalIDs.has(b);
    });
    const sortKey = (interactionSorting || '').toString().toLowerCase();
    const edgeField = sortKey.includes('scor') ? 'mscor' : sortKey.includes('correl') ? 'correlation' : 'p_value';
    const edgeAsc = edgeField === 'p_value';
    (edges as any[]).sort((e1, e2) => {
      const va = parseNum(e1[edgeField]);
      const vb = parseNum(e2[edgeField]);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return edgeAsc ? va - vb : vb - va;
    });
    if (typeof maxInteractions === 'number' && maxInteractions >= 0) {
      edges = edges.slice(0, maxInteractions);
    }

    // 10. Orphan pass LAST, over the final edge set.
    if (!showOrphans) {
      const connected = new Set<string>();
      for (const int of edges as any[]) {
        const [a, b] = 'gene1' in int
          ? [int.gene1.ensg_number, int.gene2.ensg_number]
          : [int.transcript_1.enst_number, int.transcript_2.enst_number];
        connected.add(a);
        connected.add(b);
      }
      nodes = nodes.filter((n: any) => connected.has(BrowseService.getNodeID(n)));
    }

    return { nodes, inverseNodes: [], edges, disease: dataset };
  }

  /** Bare node for a gene/transcript the network response didn't return (null metrics). */
  private bareNode(id: string, level: 'gene' | 'transcript', dataset: Dataset): any {
    const spongeRun = {
      dataset: { data_origin: '', dataset_ID: dataset.dataset_ID, disease_name: dataset.disease_name, disease_subtype: '' },
      sponge_run_ID: 0,
    };
    if (level === 'gene') {
      return { gene: { ensg_number: id, gene_symbol: id, gene_type: 'unknown' }, betweenness: null, eigenvector: null, node_degree: null, sponge_run: spongeRun };
    }
    return { transcript: { enst_number: id, gene: { ensg_number: id, gene_symbol: id, gene_type: 'unknown' }, transcript_type: 'unknown' }, betweenness: null, eigenvector: null, node_degree: null, sponge_run: spongeRun };
  }
}