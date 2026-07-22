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
  interactionSorting: InteractionSorting;
  maxInteractions: number;
}

/**
 * Drives the "Compute SpongEffects Scores" patient-specific network from PredictService's
 * state, mirroring how ExploreBrowseService drives the Explore network from ExploreService.
 *
 * A spongEffects module is defined (see backend scripts/spongEffects/classify.py
 * `define_modules`) as a center gene plus its FIRST NEIGHBOURS in the ceRNA network — i.e. the
 * module network is the star of ceRNA edges touching the center. We build it from
 * `ceRNAInteraction/findAll` on the center gene(s):
 *   - It is edge-based, so it returns every real ceRNA edge touching the center. (By contrast
 *     `getGeneNetwork` gates nodes on the `networkAnalysis` table and silently drops any gene
 *     lacking a network-analysis row along with its edges — which hides genuine
 *     center-to-member edges, so it must NOT be used here.)
 *   - Only the center gene(s) go in the URL, so there is no URL-length ceiling even for
 *     modules with hundreds/thousands of members.
 * The stored module-member list is used to label/keep the center's neighbours that are
 * members; display filters (mscor, min degree, orphans, max-node cap) are applied client-side
 * so the sliders stay instant and never trigger a refetch.
 */
const moduleIDCache = new Map<string, number>();
const centerEdgesCache = new Map<string, { nodes: (GeneNode | TranscriptNode)[]; edges: (GeneInteraction | TranscriptInteraction)[] }>();

@Injectable()
export class PredictBrowseService extends BrowseService {
  predictService = inject(PredictService);
  private spongEffectsService = inject(SpongEffectsService);

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
      const interactionSorting = this.predictService.interactionSorting$();
      const maxInteractions = this.predictService.maxInteractions$();

      const newQuery: PredictNetworkQuery = {
        scope, dataset: dataset as Dataset, version, level, topModules,
        includeMembers, showOrphans, maxNodes, minDegree, minBetweenness, minEigen,
        sortingBetweenness, sortingEigenvector, sortingDegree,
        maxPValue, minMscor, interactionSorting: interactionSorting as InteractionSorting, maxInteractions,
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

    const allIDs = new Set<string>([...centerIDs, ...memberIDs]);

    // 2. Fetch the network from the backend using the list of center ensembl IDs (cached).
    let networkNodes: (GeneNode | TranscriptNode)[] = [];
    let networkEdges: (GeneInteraction | TranscriptInteraction)[] = [];
    const cacheKey = `${level}_${dataset.dataset_ID}_${version}_${scope}_${maxPValue}_${minMscor}_${Array.from(centerIDs).sort().join(',')}`;
    
    if (centerEdgesCache.has(cacheKey)) {
      const cached = centerEdgesCache.get(cacheKey)!;
      networkNodes = cached.nodes;
      networkEdges = cached.edges;
    } else {
      try {
        const browseQuery = {
          level,
          dataset,
          ensemblID: Array.from(centerIDs),
          showOrphans: true,
          sortingDegree,
          sortingEigenvector,
          sortingBetweenness,
          minDegree: 0,
          minBetweenness: 0,
          minEigen: 0,
          maxPValue: maxPValue,
          minMscor: minMscor,
          maxNodes: 1000, // retrieve all nodes so we filter and cap client-side
          maxInteractions: 10000,
          interactionSorting: interactionSorting
        };

        const result = await this.backend.getNetwork(version, browseQuery);
        networkNodes = result.nodes || [];
        networkEdges = result.edges || [];
        centerEdgesCache.set(cacheKey, { nodes: networkNodes, edges: networkEdges });
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
    const inducedDegree = new Map<string, number>();

    const wanted = (id: string) => centerIDs.has(id) || (includeMembers && memberIDs.has(id));

    for (const int of networkEdges as any[]) {
      const mscorVal = typeof int.mscor === 'number' ? int.mscor : parseFloat(int.mscor) || 0;
      if (mscorVal < minMscor) continue;
      const [aID, bID] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      
      if (!wanted(aID) || !wanted(bID)) continue;
      keptEdges.push(int);
      inducedDegree.set(aID, (inducedDegree.get(aID) ?? 0) + 1);
      inducedDegree.set(bID, (inducedDegree.get(bID) ?? 0) + 1);
    }

    // 5. Add virtual star edges for model module members that were pruned (mscor = 0.0 runs)
    if (includeMembers) {
      const localScopeMembers = (prediction as any)?.module_members?.[scope];
      const scopeMembers = localScopeMembers || dbModuleMembers;
      for (const center of centerIDs) {
        const members = scopeMembers ? scopeMembers[center] : undefined;
        if (members && Array.isArray(members)) {
          members.forEach((m: string) => {
            if (!m || m === center) return;

            // Check if we already have an edge between center and m
            const hasEdge = keptEdges.some((int: any) => {
              const [aID, bID] = 'gene1' in int
                ? [int.gene1.ensg_number, int.gene2.ensg_number]
                : [int.transcript_1.enst_number, int.transcript_2.enst_number];
              return (aID === center && bID === m) || (aID === m && bID === center);
            });

            if (!hasEdge) {
              const virtualEdge = this.createVirtualEdge(center, m, level, dataset);
              keptEdges.push(virtualEdge);
              inducedDegree.set(center, (inducedDegree.get(center) ?? 0) + 1);
              inducedDegree.set(m, (inducedDegree.get(m) ?? 0) + 1);
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

    // Optionally include disconnected members as orphan nodes.
    if (includeMembers && showOrphans) {
      for (const id of memberIDs) {
        if (!nodeMap.has(id)) {
          const meta = edgeMeta.get(id);
          nodeMap.set(id, this.minimalNode(id, level, dataset, false, meta?.symbol, meta?.geneType, meta?.transcriptType));
        }
      }
    }

    // 6. Map nodes with induced degree + isCenter, apply degree and centrality filters, then cap
    let nodes = Array.from(nodeMap.values()).map((n) => {
      const id = BrowseService.getNodeID(n);
      return { ...n, node_degree: inducedDegree.get(id) ?? 0, isCenter: centerIDs.has(id) } as any;
    });

    nodes = nodes.filter((n) => {
      if (n.isCenter) return true;
      const degreeOk = n.node_degree >= minDegree;
      const betweennessOk = minBetweenness === 0 || (n.betweenness !== null && n.betweenness >= minBetweenness);
      const eigenOk = minEigen === 0 || (n.eigenvector !== null && n.eigenvector >= minEigen);
      return degreeOk && betweennessOk && eigenOk;
    });

    if (!showOrphans) {
      nodes = nodes.filter((n) => n.isCenter || n.node_degree > 0);
    }

    const centerNodes = nodes.filter((n) => n.isCenter);
    const nonCenterNodes = nodes.filter((n) => !n.isCenter);

    // Sort by metric preferences
    nonCenterNodes.sort((a, b) => {
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
        const valA = a.node_degree;
        const valB = b.node_degree;
        if (valA !== valB) return valB - valA;
      }
      return b.node_degree - a.node_degree;
    });

    const slicedNonCenterNodes = nonCenterNodes.slice(0, Math.max(0, maxNodes - centerNodes.length));
    nodes = [...centerNodes, ...slicedNonCenterNodes];

    const finalIDs = new Set(nodes.map((n) => BrowseService.getNodeID(n)));
    const edges = keptEdges.filter((int: any) => {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      return finalIDs.has(a) && finalIDs.has(b);
    });

    return { nodes, inverseNodes: [], edges, disease: dataset };
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
        betweenness: 0, eigenvector: 0, node_degree: 0, sponge_run: spongeRun,
      } as GeneNode;
    }
    return {
      transcript: {
        enst_number: g.enst_number,
        gene: g.gene ?? { ensg_number: g.enst_number, gene_symbol: g.enst_number, gene_type: 'unknown' },
        transcript_type: g.transcript_type || 'unknown',
      },
      betweenness: 0, eigenvector: 0, node_degree: 0, sponge_run: spongeRun,
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
        betweenness: 0, eigenvector: 0, node_degree: 0, sponge_run: spongeRun,
      } as GeneNode;
    }
    return {
      transcript: { enst_number: id, gene: { ensg_number: id, gene_symbol: symbol || id, gene_type: geneType || 'unknown' }, transcript_type: transcriptType || 'unknown' },
      betweenness: 0, eigenvector: 0, node_degree: 0, sponge_run: spongeRun,
    } as TranscriptNode;
  }

  private createVirtualEdge(center: string, member: string, level: 'gene' | 'transcript', dataset: Dataset): any {
    const spongeRun = {
      dataset: { data_origin: '', dataset_ID: dataset.dataset_ID, disease_name: dataset.disease_name, disease_subtype: '' },
      sponge_run_ID: 0,
    };
    if (level === 'gene') {
      return {
        correlation: 0.0,
        mscor: '<0.1',
        p_value: 0.0,
        gene1: { ensg_number: center, gene_symbol: center, gene_type: 'unknown' },
        gene2: { ensg_number: member, gene_symbol: member, gene_type: 'unknown' },
        sponge_run: spongeRun
      } as any;
    } else {
      return {
        correlation: 0.0,
        mscor: '<0.1',
        p_value: 0.0,
        transcript_1: { enst_number: center, gene: { ensg_number: center, gene_symbol: center, gene_type: 'unknown' }, transcript_type: 'unknown' },
        transcript_2: { enst_number: member, gene: { ensg_number: member, gene_symbol: member, gene_type: 'unknown' }, transcript_type: 'unknown' },
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
