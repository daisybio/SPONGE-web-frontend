import { Component, computed, effect, inject, input, signal, Version } from '@angular/core';
import { PredictService } from '../service/predict.service';
import { ReusableHeatmapComponent, HeatmapDataSource } from '../../../../components/heatmap-plot/heatmap-plot.component';
import { BackendService } from '../../../../services/backend.service';
import { VersionsService } from '../../../../services/versions.service';
import { symbolCache } from '../../explore/plots/lollipop-plot/lollipop-plot.component';

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
  // Synchronized with the shared "Score Scope" selector: filters samples down to the
  // selected type, or shows all samples for the 'pancancer' scope.
  selectedScope$ = this.predictService.selectedScope$;


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
    // Effect to process scores when they change or patient selection changes
    effect(() => {
      const scores = this.enrichmentScores$();
      const samples = this.predictService.selectedSamples$();
      const scope = this.selectedScope$();
      this.processEnrichmentScores(scores);
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

      // Make a deep copy so you don't mutate the original data!
      const copiedScores = {
        genes: [...scores.genes],
        samples: [...scores.samples],
        values: scores.values.map(row => [...row])
      };

      // Filter by selected samples first
      const selectedSamples = this.predictService.selectedSamples$();
      let keepIndices = selectedSamples.length > 0
        ? copiedScores.samples.map((s, index) => ({ s, index })).filter(({ s }) => selectedSamples.includes(s)).map(({ index }) => index)
        : copiedScores.samples.map((_, index) => index);

      // For a type-level scope, filter down to samples predicted as that type.
      // 'pancancer' shows all samples.
      const selectedType = this.selectedScope$();
      if (selectedType && selectedType !== 'pancancer') {
        keepIndices = keepIndices.filter((index) => this.getPredictionForSample(copiedScores.samples[index]) === selectedType);
      }

      copiedScores.samples = keepIndices.map((i) => copiedScores.samples[i]);
      copiedScores.values = copiedScores.values.map((row: number[]) => keepIndices.map((i) => row[i]));

      const genes = [...copiedScores.genes];
      const samples = [...copiedScores.samples];
      const values = copiedScores.values.map(row => [...row]);

      // subset for first 12 genes
      let finalGenes = genes;
      let finalValues = values;
      if (genes.length > 12) {
        finalGenes = genes.slice(0, 12);
        finalValues = values.slice(0, 12);
      }

      const missingGenes = finalGenes.filter(g => !symbolCache.has(g));
      if (missingGenes.length > 0) {
        await Promise.all(missingGenes.map(async (geneId: string) => {
          try {
            const response = await this.backend.getGeneInfo(this.versionService.version$(), geneId);
            if (response.length === 1 && response[0].gene_symbol) {
              symbolCache.set(geneId, response[0].gene_symbol);
            } else {
              symbolCache.set(geneId, geneId);
            }
          } catch (e) {
            console.error(e);
            symbolCache.set(geneId, geneId);
          }
        }));
      }

      finalGenes.forEach((gene, geneIndex) => {
        const displayName = symbolCache.get(gene) ?? gene;
        samples.forEach((sample, sampleIndex) => {
          transformedData.push({
            id: displayName,
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
      return samplePrediction?.typePrediction ?? 'Unknown';
    }
    return 'Unknown';
  }


  onPlotRendered() {
  }


}
