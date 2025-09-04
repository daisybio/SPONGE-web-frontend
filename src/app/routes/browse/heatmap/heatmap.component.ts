import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  resource,
  viewChild,
} from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { BackendService } from '../../../services/backend.service';
import { VersionsService } from '../../../services/versions.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { capitalize } from 'lodash';
import { ReusableHeatmapComponent, HeatmapDataSource } from '../../../components/heatmap-plot/heatmap-plot.component';
import { CommonModule } from '@angular/common';

declare const Plotly: any;


@Component({
  selector: 'app-gene-expression-heatmap',
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
  imports: [CommonModule, ReusableHeatmapComponent]
})
export class GeneExpressionHeatmapComponent {
  browseService = inject(BrowseService);
  backend = inject(BackendService);
  versions = inject(VersionsService);

  // Inputs
  refreshSignal = input.required<any>();

  // State
  level$ = this.browseService.level$;
  
  // Parameters derived from services
  heatmapParams = computed(() => ({
    nodes: this.browseService.nodes$(),
    disease: this.browseService.disease$(),
    level: this.browseService.level$(),
    version: this.versions.versionReadOnly()(),
  }));

  // Create data source for the heatmap
  heatmapDataSource: HeatmapDataSource = {
    getData: async (params) => {
      const { nodes, disease, version, level } = params;
      
      if (!nodes || !disease || !level) {
        return [];
      }

      const identifiers = nodes.map((node: any) => BrowseService.getNodeID(node));

      // Fetch expression data with pagination
      const expressionData = await this.backend.fetchExpressionData(version, identifiers, disease.dataset_ID, disease.disease_name, level);
      
      // Handle disease subtypes
      if (disease.disease_name === 'pancancer') {
        await this.handlePancancerSubtypes(expressionData);
      } else {
        await ReusableHeatmapComponent.handleDiseaseSubtypes(expressionData, disease.disease_name, this.backend);
      }

      return expressionData;
    },
    
    getTitle: (params) => {
      return `${capitalize(params.level)} Expression Heatmap - ${capitalize(params.disease?.disease_name || 'Unknown')}`;
    },
    
    getYAxisTitle: () => {
      return capitalize(this.level$());
    },
    
    getZAxisTitle: () => {
      return 'Normalized<br>expression';
    },
    
    getZMid: () => 0,
    
    getColorScale: () => 'RdBu'
  };

  private async handlePancancerSubtypes(expressionData: any[]): Promise<void> {
    // Fetch the mapping from TSS codes to disease names
    const mapping = await this.backend.getDiseaseFromSample();
    
    // Add the disease name to the expression data
    for (const e of expressionData) {
      const sampleId = e.sample_ID;
      // mapSampleToDisease from ReusableHeatmapComponent
      const diseaseName = await ReusableHeatmapComponent.mapSampleToDisease(sampleId, mapping);
      e.disease_subtype = diseaseName;
    }
  }
}