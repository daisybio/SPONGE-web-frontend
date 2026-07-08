import { Component, computed, effect, inject, input, signal, Version } from '@angular/core';
import { PredictService } from '../service/predict.service';
import { ReusableHeatmapComponent, HeatmapDataSource } from '../../../../components/heatmap-plot/heatmap-plot.component';
import { BackendService } from '../../../../services/backend.service';
import { VersionsService } from '../../../../services/versions.service';

interface Scores {
  genes: string[];
  samples: string[];
  values: number[][];
}

@Component({
  selector: 'app-module-heatmap',
  imports: [
    ReusableHeatmapComponent
  ],
  templateUrl: './module-heatmap.component.html',
  styleUrl: './module-heatmap.component.scss'
})
export class ModuleHeatmapComponent {
  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$
  // predictionResource = this.predictService._prediction$;
  enrichmentScores$ = computed(() => this.prediction$()?.scores);
  backend = inject(BackendService);
  versionService = inject(VersionsService);
  selectedPredictedType$ = this.predictService.selectedPredictedType$;
  // selectedPredictedType$ = signal<string>("Breast Invasive Carcinoma"); // Default value for testing


  refreshSignal$ = input();

  // Optional configuration
  title = input<string>('ceRNA Module Enrichment Score Heatmap');
  height = input<string>('600px');
  width = input<string>('100%');
  showSubtypes = input<boolean>(false); // Default to false as scores may not have subtype info
  
  // State
  loading = signal(false);
  error = signal<string | null>(null);
  transformedData = signal<any[]>([]);
  heatmapParams = signal<any>({});

  // Create the data source for the heatmap component
  heatmapDataSource: HeatmapDataSource = {
    getData: async (params: any) => {
      return this.transformedData();
    },
    getTitle: () => this.title(),
    getZAxisTitle: () => 'ceRNA<br>Enrichment<br>Score',
    getYAxisTitle: () => 'Gene',
    getColorScale: () => 'RdBu',
    getZMid: () => 0, // For diverging color scale centered at 0
    getClusterLegendTitle: () => this.showSubtypes() ? 'Predicted Cancer Subtype' : 'Predicted Cancer Type',
  };
  
  constructor() {
    // Effect to process scores when they change
    effect(() => {
      this.processEnrichmentScores(this.enrichmentScores$());
    });
  }
  
  ngOnInit(): void {
    // Initial processing
    this.processEnrichmentScores(this.enrichmentScores$());
  }

  async processEnrichmentScores(scores: Scores | undefined): Promise<void> {
    if (!scores || !scores.genes || !scores.samples || !scores.values) {
      return;
    }

      this.loading.set(true);
      this.error.set(null);
      
      let transformedData: any[] = [];

      // if a predicted type is selected, filter scores
      if (this.selectedPredictedType$()) {
        const selectedType = this.selectedPredictedType$();
        scores.samples = scores.samples.filter((sample: string) => {
          const prediction = this.getPredictionForSample(sample);
          return prediction === selectedType;
        });
        scores.values = scores.values.map((row: number[]) =>
          row.filter((_, index: number) => scores.samples[index] !== undefined)
        );
      }

      // Make a deep copy so you don't mutate the original data!
      const genes = [...scores.genes];
      const samples = [...scores.samples];
      const values = scores.values.map(row => [...row]);

      // subset for first 12 genes
      let finalGenes = genes;
      let finalValues = values;
      if (genes.length > 12) {
        finalGenes = genes.slice(0, 12);
        finalValues = values.slice(0, 12);
      }

      for (const geneId of finalGenes) {
        let gene_symbol = geneId;
        const response = await this.backend.getGeneInfo(this.versionService.version$(), geneId);
        if (response.length === 1) {
          gene_symbol = response[0].gene_symbol;
        } else {
          console.warn(`Gene ID ${geneId} not found in the database or more than one gene symbol found.`);
        }
      }

      finalGenes.forEach((gene, geneIndex) => {
        samples.forEach((sample, sampleIndex) => {
          transformedData.push({
            id: gene,
            sample_ID: sample,
            expr_value: finalValues[geneIndex][sampleIndex],
            disease_subtype: this.getPredictionForSample(sample)
          });
        });
      });

      this.transformedData.set(transformedData);
      this.heatmapParams.set({ source: 'enrichment_scores', disease: {disease_name: 'pancancer'} });
      this.loading.set(false);
      }

  getPredictionForSample(sampleID: string): string {
    const prediction = this.prediction$();
    if (prediction && prediction.data) {
      const samplePrediction = prediction.data.find((prediction_data: any) => prediction_data.sampleID === sampleID);
      return samplePrediction ? samplePrediction.typePrediction : 'Unknown';
    }
    return 'Unknown';
  }


  onPlotRendered() {
  }


}
