import { Component, effect, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { PredictionResultsComponent } from './prediction-results/prediction-results.component';
import { PredictionTableComponent } from "./prediction-results/prediction-table/prediction-table.component";
import { ModuleHeatmapComponent } from './module-heatmap/module-heatmap.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ModuleTableComponent } from "./module-table/module-table.component";
import { PredictFormComponent } from './form/predict-form.component';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { ScatterplotComponent, ScatterplotDataScource } from "../../../components/scatterplot/scatterplot.component";
import { ClassificationPlotComponent } from './classification-plot/classification-plot.component';
import { PredictService } from './service/predict.service';
import { BackendService } from '../../../services/backend.service';
import { VersionsService } from '../../../services/versions.service';

declare var Plotly: any;

@Component({
  selector: 'app-predict',
  imports: [
    PredictionResultsComponent,
    PredictionTableComponent,
    ModuleHeatmapComponent,
    MatTabsModule,
    ModuleTableComponent,
    PredictFormComponent,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    ScatterplotComponent,
    ClassificationPlotComponent,
  ],
  templateUrl: './predict.component.html',
  styleUrl: './predict.component.scss',
})
export class PredictComponent {
  predictService = inject(PredictService);
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
  refreshSignal = signal<number>(0);

  // Move data loading state to the data source
  private transformedData = signal<any[]>([]);
  private loading = signal(false);
  private error = signal<string | null>(null);

  scatterplotParams = signal<any>({});

  // Updated data source to properly handle async data
  scatterplotDataSource = signal<ScatterplotDataScource>({
    getData: async (params: any) => {
      // Return existing data if available
      const existingData = this.transformedData();
      if (existingData && existingData.length > 0) {
        return existingData;
      }

      // Otherwise trigger data update and wait for it
      await this.updateScatterplotData();
      return this.transformedData();
    },
    getTitle: () => 'Top ceRNA Modules for Uploaded Samples',
    getXTitle: () => 'Mean TCGA Enrichment Score',
    getYTitle: () => 'Custom Enrichment Score',
    getColorScale: () => '',
  });

  constructor() {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.refresh();
      });

    effect(() => {
      const prediction = this.predictService.prediction$();
      const selectedType = this.predictService.selectedPredictedType$();

      if (prediction && selectedType) {
        this.scatterplotParams.set({
          disease: selectedType,
          prediction: prediction,
        });

        if (this.transformedData().length === 0) {
          this.updateScatterplotData();
        }
      }
    });
  }

  refresh() {
    this.refreshSignal.update((v) => v + 1);
  }

  async updateScatterplotData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const prediction = this.predictService.prediction$();
      if (!prediction) {
        this.transformedData.set([]);
        return;
      }

      const scores = prediction.scores;
      if (!scores || !scores.genes || scores.genes.length === 0) {
        this.transformedData.set([]);
        return;
      }

      const tcga_scores = await this.getTcgaSpongEffectsScores(scores.genes);

      if (!tcga_scores || tcga_scores.length === 0) {
        this.transformedData.set([]);
        return;
      }

      const level = this.predictService.level();

      // Build Map of Gene/Transcript ID -> { score: number, symbol: string }
      const tcgaMap = new Map<string, { score: number; symbol: string }>();
      for (const item of tcga_scores) {
        const id = level === 'gene' ? item.gene?.ensg_number : item.transcript?.enst_number;
        const symbol = level === 'gene' ? item.gene?.gene_symbol : item.transcript?.gene?.gene_symbol;
        if (id) {
          tcgaMap.set(id, { score: item.score_value || 0, symbol: symbol || id });
        }
      }

      // Transform scores to scatterplot data format
      const scatterData = scores.genes.map((gene: string, index: number) => {
        const tcgaInfo = tcgaMap.get(gene);
        const customScore = scores.values[index]?.[0] || 0;

        return {
          id: tcgaInfo?.symbol || gene,
          x: tcgaInfo?.score ?? 0,
          y: customScore,
        };
      });

      this.transformedData.set(scatterData);

    } catch (error) {
      console.error('Error updating scatterplot data:', error);
      this.error.set(error instanceof Error ? error.message : 'Unknown error');
      this.transformedData.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async getTcgaSpongEffectsScores(genes: string[]): Promise<any[]> {
    const level = this.predictService.level();
    const version = this.versionsService.versionReadOnly()();
    const disease = this.predictService.selectedPredictedType$() || 'pancancer';

    if (!disease || !version || !genes || genes.length === 0) {
      return [];
    }

    try {
      let allModules: any[] = [];
      if (level === 'gene') {
        allModules = await this.backend.getSpongEffectsGeneModules(version, disease, undefined, 10000);
      } else {
        allModules = await this.backend.getSpongEffectsTranscriptModules(version, disease, undefined, 10000);
      }

      const moduleMap = new Map<string, number>();
      for (const m of allModules) {
        const id = level === 'gene' ? m.gene?.ensg_number : m.transcript?.enst_number;
        const moduleId = level === 'gene' ? m.spongEffects_gene_module_ID : m.spongEffects_transcript_module_ID;
        if (id && moduleId !== undefined) {
          moduleMap.set(id, moduleId);
        }
      }

      const moduleIDs = genes
        .map(gene => moduleMap.get(gene))
        .filter((id): id is number => id !== undefined);

      if (moduleIDs.length === 0) {
        return [];
      }


      return await this.backend.fetchSpongEffectsEnrichScores(version, level, moduleIDs, false, true) || [];
    } catch (error) {
      console.error('Error in getTcgaSpongEffectsScores:', error);
      return [];
    }
  }

  onTabChange(event: any) {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }
}