import { Injectable, effect, inject } from '@angular/core';
import { BrowseService } from './browse.service';
import { ExploreService } from '../routes/spongeffects/explore/service/explore.service';
import { GeneNode, TranscriptNode, GeneInteraction, TranscriptInteraction, NetworkData, SpongEffectsRun } from '../interfaces';
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

    // React to explore changes
    effect(() => {
      const dataset = this.exploreService.selectedDiseaseObject$();
      const level = this.exploreService.level$();
      const ensemblID = this.exploreService.selectedModules.value()?.map((m: any) => m.ensemblID) ?? [];

      const oldQuery = this.getQuery();
      if (!oldQuery) return;

      // Only update if something actually changed
      if (
        oldQuery.dataset !== dataset ||
        oldQuery.level !== level ||
        !isEqual(oldQuery.ensemblID, ensemblID)
      ) {
        const newQuery = {
          ...oldQuery,
          dataset,
          level,
          ensemblID,
        };
        this.runQuery(newQuery);
      }
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

    // Append allowed module list to config before fetching network
    config.ensemblID = Array.from(allowedIDs);
    config.level = this.exploreService.level$();
    config.dataset = this.exploreService.selectedDiseaseObject$();

    // 1. Fetch direct level network only (bypass inverse network request entirely)
    const { nodes: rawNodes, edges: rawEdges } = await this.backend.getNetwork(version, config);

    // 2. Filter nodes and edges strictly to allowed IDs
    let nodes = rawNodes.filter(
      node => allowedIDs.has(
        'gene' in node ? node.gene.ensg_number : node.transcript.enst_number
      )
    );
    const edges = rawEdges.filter(
      edge => {
        const [id1, id2] = BrowseService.getInteractionIDs(edge);
        return allowedIDs.has(id1) && allowedIDs.has(id2);
      }
    );

    // 3. Filter orphans if showOrphans is false
    if (!config.showOrphans) {
      const interactionNodes = edges
        .map((interaction) => BrowseService.getInteractionIDs(interaction))
        .flat();
      nodes = nodes.filter((node) => {
        const nodeObject = BrowseService.getNodeID(node);
        return interactionNodes.some((interactionObject) =>
          isEqual(interactionObject, nodeObject)
        );
      });
    }

    // 4. Annotate center and member nodes in the network
    const selectedCenterIDs = new Set(selectedModules.map(m => m.ensemblID));
    nodes = nodes.map(node => {
      const isGene = 'gene' in node;
      const clonedNode: any = isGene
        ? { ...node, gene: { ...node.gene } }
        : { ...node, transcript: { ...node.transcript, gene: { ...node.transcript.gene } } };

      const ensemblID = isGene ? clonedNode.gene.ensg_number : clonedNode.transcript.enst_number;
      const isCenter = selectedCenterIDs.has(ensemblID);
      clonedNode.isCenter = isCenter;

      if (isCenter) {
        // Collect parameter thresholds for center models
        const matchingModules = selectedModules.filter(m => m.ensemblID === ensemblID);
        const modelInfos = matchingModules.map(m => {
          const run = (this.exploreService.spongeEffectsRuns$() || []).find((r: SpongEffectsRun) => r.spongEffects_run_ID === m.spongEffects_run_ID);
          return run ? `mscor=${run.m_scor_threshold}` : '';
        }).filter(Boolean);
        const modelStr = modelInfos.length > 0 ? ` [Center: ${Array.from(new Set(modelInfos)).join(', ')}]` : ' [Center]';

        if (isGene) {
          const symbol = clonedNode.gene.gene_symbol || clonedNode.gene.ensg_number;
          clonedNode.gene.gene_symbol = `${symbol}${modelStr}`;
        } else {
          const symbol = clonedNode.transcript.gene.gene_symbol || clonedNode.transcript.gene.ensg_number;
          clonedNode.transcript.gene.gene_symbol = `${symbol}${modelStr}`;
        }
      } else {
        if (isGene) {
          const symbol = clonedNode.gene.gene_symbol || clonedNode.gene.ensg_number;
          clonedNode.gene.gene_symbol = `${symbol} (Member)`;
        } else {
          const symbol = clonedNode.transcript.gene.gene_symbol || clonedNode.transcript.gene.ensg_number;
          clonedNode.transcript.gene.gene_symbol = `${symbol} (Member)`;
        }
      }
      return clonedNode;
    });

    return {
      nodes,
      inverseNodes: [],
      edges,
      disease: config.dataset,
    };
  }
}