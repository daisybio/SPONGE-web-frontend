import { Injectable, effect, inject, untracked } from '@angular/core';
import { BrowseService } from './browse.service';
import { ExploreService } from '../routes/spongeffects/explore/service/explore.service';
import { GeneNode, TranscriptNode, GeneInteraction, TranscriptInteraction, NetworkData, InteractionSorting } from '../interfaces';
import { BackendService } from './backend.service';
import { VersionsService } from './versions.service';
import { isEqual } from 'lodash';

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
    const selectedModules = this.exploreService.selectedModules.value() ?? [];
    if (selectedModules.length === 0) {
      return {
        nodes: [],
        inverseNodes: [],
        edges: [],
        disease: config?.dataset,
      };
    }

    const includeMembers = this.exploreService.includeModuleMembers();

    // Collect allowed node IDs (modules and, if enabled, members)
    const allowedIDs = new Set<string>();
    for (const module of selectedModules) {
      allowedIDs.add(module.ensemblID);
    }

    if (includeMembers) {
      // 1. Identify which modules are not in the cache yet
      const modulesToFetch = selectedModules.filter(
        module => !this.exploreService.moduleMembersMap.has(this.exploreService.getModuleKey(module))
      );

      // 2. Fetch all missing module members concurrently (in parallel!)
      await Promise.all(modulesToFetch.map(module => this.exploreService.fetchModuleMembers(module)));

      // 3. Populate all member IDs from the cache
      for (const module of selectedModules) {
        const key = this.exploreService.getModuleKey(module);
        const members = this.exploreService.moduleMembersMap.get(key) || [];
        for (const member of members) {
          allowedIDs.add(member.ensemblID);
        }
      }
    }

    // Read all display filters from ExploreService (the shared drawer signals).
    const es = this.exploreService;
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
    const dataset = es.selectedDiseaseObject$();

    // Fetch the FULL induced subgraph on the allowed set, UNFILTERED. Every display filter is
    // applied client-side below (identical to the patient-specific network). Sending the sliders
    // to the backend instead drops induced nodes/edges server-side — that is why min-degree=1 or
    // min-betweenness=0.1 previously wiped the whole module.
    const browseQuery = {
      level: es.level$(),
      dataset,
      ensemblID: Array.from(allowedIDs),
      showOrphans: true,
      sortingDegree,
      sortingEigenvector,
      sortingBetweenness,
      minDegree: 0,
      minBetweenness: 0,
      minEigen: 0,
      maxPValue: 1,
      minMscor: 0,
      maxNodes: allowedIDs.size + 10,
      maxInteractions: 50000,
      interactionSorting,
    };

    let rawNodes: (GeneNode | TranscriptNode)[] = [];
    let rawEdges: (GeneInteraction | TranscriptInteraction)[] = [];
    try {
      const result = await this.backend.getNetwork(version, browseQuery as any);
      rawNodes = result.nodes || [];
      rawEdges = result.edges || [];
    } catch (e) {
      console.error('Error fetching explore network:', e);
      return { nodes: [], inverseNodes: [], edges: [], disease: dataset };
    }

    const centerIDs = new Set(selectedModules.map(m => m.ensemblID));
    const parseNum = (v: any) => { const f = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(f) ? f : null; };

    // Nodes restricted to the allowed set, tagged with isCenter.
    let nodes: any[] = rawNodes
      .filter(n => allowedIDs.has(BrowseService.getNodeID(n)))
      .map(n => ({ ...n, node_degree: (n as any).node_degree ?? null, isCenter: centerIDs.has(BrowseService.getNodeID(n)) }));

    // Keep edges: mscor + p-value cutoffs, both endpoints in the allowed set.
    const keptEdges = (rawEdges as any[]).filter(int => {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      if (!allowedIDs.has(a) || !allowedIDs.has(b)) return false;
      const mscor = parseNum(int.mscor);
      if (mscor !== null && mscor < minMscor) return false;
      const p = parseNum(int.p_value);
      if (p !== null && p > maxPValue) return false;
      return true;
    });

    // Rank members by the strength of their edge to a center (like the patient-specific network),
    // so the node cap keeps center-connected members — and therefore their center<->member edges —
    // rather than the globally-highest-centrality members, which may have no edge to the center.
    const memberCenterMscor = new Map<string, number>();
    for (const int of keptEdges as any[]) {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      const aIsCenter = centerIDs.has(a);
      const bIsCenter = centerIDs.has(b);
      if (aIsCenter === bIsCenter) continue; // only center<->member edges rank members
      const member = aIsCenter ? b : a;
      const mscor = parseNum(int.mscor) ?? -Infinity;
      memberCenterMscor.set(member, Math.max(memberCenterMscor.get(member) ?? -Infinity, mscor));
    }

    // Node filters (degree / centrality / gene-type / support) applied to ALL nodes; a 0 threshold
    // passes through (incl. nodes with null metrics), matching the patient-specific network.
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

    // Sort centers first (so "Max module centers" governs the visible modules), then by center-edge
    // strength (keeps connected members under the cap), then by the selected centrality metric(s).
    nodes.sort((a: any, b: any) => {
      if (a.isCenter !== b.isCenter) return a.isCenter ? -1 : 1;
      const am = memberCenterMscor.get(BrowseService.getNodeID(a)) ?? -Infinity;
      const bm = memberCenterMscor.get(BrowseService.getNodeID(b)) ?? -Infinity;
      if (am !== bm) return bm - am;
      if (sortingBetweenness) { const x = a.betweenness ?? -1, y = b.betweenness ?? -1; if (x !== y) return y - x; }
      if (sortingEigenvector) { const x = a.eigenvector ?? -1, y = b.eigenvector ?? -1; if (x !== y) return y - x; }
      if (sortingDegree) { const x = a.node_degree ?? 0, y = b.node_degree ?? 0; if (x !== y) return y - x; }
      return (b.node_degree ?? 0) - (a.node_degree ?? 0);
    });
    if (typeof maxNodes === 'number' && !isNaN(maxNodes)) {
      nodes = nodes.slice(0, Math.max(0, maxNodes));
    }

    // Edges among the surviving nodes, sorted + capped by the interaction controls.
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

    // Orphan pass LAST, over the final edge set — a node stranded by ANY filter is hidden when
    // "Show orphans" is off.
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
}