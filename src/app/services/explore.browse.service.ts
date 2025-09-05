import { Injectable, inject } from '@angular/core';
import { BrowseService } from './browse.service';
import { ExploreService } from '../routes/spongeffects/explore/service/explore.service';
import { GeneNode, TranscriptNode, GeneInteraction, TranscriptInteraction, NetworkData } from '../interfaces';

@Injectable()
export class ExploreBrowseService extends BrowseService {
  exploreService = inject(ExploreService);
  disease = this.exploreService.selectedDisease$();

  override async fetchData(
    version: number,
    config: any // Use the correct type for your BrowseQuery
  ): Promise<NetworkData> {
    // 1. Get the full network using the default logic
    const fullNetwork = await super.fetchData(version, config);

    // 2. Get selected modules and members from ExploreService
    const selectedModules = this.exploreService.selectedModules.value() ?? [];
    const includeMembers = this.exploreService.includeModuleMembers();

    // 3. Collect allowed node IDs (modules and, if enabled, members)
    const allowedIDs = new Set<string>();
    for (const module of selectedModules) {
      allowedIDs.add(module.ensemblID);
      if (includeMembers) {
        // Use centralized, cached member fetching
        const key = `${module.ensemblID}_${module.spongEffects_run_ID}`;
        if (!this.exploreService.moduleMembersMap.has(key)) {
          await this.exploreService.fetchModuleMembers(module);
        }
        const members = this.exploreService.moduleMembersMap.get(key) || [];
        for (const member of members) {
          allowedIDs.add(member.ensemblID);
        }
      }
    }

    // 4. Filter nodes and edges
    const nodes = fullNetwork.nodes.filter(
      node => allowedIDs.has(
        'gene' in node ? node.gene.ensg_number : node.transcript.enst_number
      )
    );
    const edges = fullNetwork.edges.filter(
      edge => {
        const [id1, id2] = BrowseService.getInteractionIDs(edge);
        return allowedIDs.has(id1) && allowedIDs.has(id2);
      }
    );
    const inverseNodes = fullNetwork.inverseNodes?.filter(
      node => allowedIDs.has(
        'gene' in node ? node.gene.ensg_number : node.transcript.enst_number
      )
    ) ?? [];

    return {
      ...fullNetwork,
      nodes,
      edges,
      inverseNodes,
    };
  }
}