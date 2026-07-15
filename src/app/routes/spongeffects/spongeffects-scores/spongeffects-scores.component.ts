// Trigger watcher rebuild
import { Component, computed, effect, inject, signal } from '@angular/core';
import { PredictFormComponent } from '../predict/form/predict-form.component';
import { PredictService } from '../predict/service/predict.service';
import { PredictBrowseService } from '../../../services/predict.browse.service';
import { NetworkComponent } from '../../../components/browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../../../components/browse-views/active-entities/active-entities.component';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { capitalize } from 'lodash';
// import { EnrichmentClassPlotComponent } from '../explore/plots/enrichment-class-plot/enrichment-class-plot.component';
import { LollipopPlotComponent } from '../explore/plots/lollipop-plot/lollipop-plot.component';
import { PredictionResultsComponent } from '../predict/prediction-results/prediction-results.component';
import { PredictionTableComponent } from '../predict/prediction-results/prediction-table/prediction-table.component';
import { ModuleFormComponent } from '../explore/form/module-form/module-form.component';
import { ClassificationPlotComponent } from "../predict/classification-plot/classification-plot.component";
import { ModuleTableComponent } from '../predict/module-table/module-table.component';
import { ModuleHeatmapComponent } from '../predict/module-heatmap/module-heatmap.component';
import { ScatterplotComponent, ScatterplotDataScource } from '../../../components/scatterplot/scatterplot.component';
import { BackendService } from '../../../services/backend.service';
import { VersionsService } from '../../../services/versions.service';
import { UmapPlotComponent } from '../predict/umap-plot/umap-plot.component';

@Component({
  selector: 'app-spongeffects-scores',
  imports: [
    PredictFormComponent,
    NetworkComponent,
    ActiveEntitiesComponent,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatButtonToggleModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    CommonModule,
    MatTabsModule,
    // EnrichmentClassPlotComponent,
    LollipopPlotComponent,
    PredictionResultsComponent,
    PredictionTableComponent,
    ModuleFormComponent,
    ClassificationPlotComponent,
    ModuleTableComponent,
    ModuleHeatmapComponent,
    ScatterplotComponent,
    UmapPlotComponent,
  ],
  providers: [PredictBrowseService],
  templateUrl: './spongeffects-scores.component.html',
  styleUrl: './spongeffects-scores.component.scss',
})
export class SpongeffectsScoresComponent {
  predictService = inject(PredictService);
  browseService = inject(PredictBrowseService);
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);
  protected readonly capitalize = capitalize;

  refreshSignal = signal<number>(0);
  selectedTabIndex = signal<number>(0);
  selectedSubVis = signal<string>('importance');

  error$ = computed(() => {
    const error = this.predictService._prediction$.error();
    if (!error) return undefined;
    if (typeof error === 'object' && 'error' in error) {
      const body = (error as any).error;
      if (body && typeof body === 'object') {
        return body.detail || body.message || JSON.stringify(body);
      }
      return body || JSON.stringify(error);
    }
    return String(error);
  });

  // Scatterplot state
  private transformedData = signal<any[]>([]);
  scatterplotParams = signal<any>({});

  scatterplotDataSource = signal<ScatterplotDataScource>({
    getData: async (_params: any) => {
      const existing = this.transformedData();
      if (existing && existing.length > 0) return existing;
      await this.updateScatterplotData();
      return this.transformedData();
    },
    getTitle: () => 'Top ceRNA Modules for Uploaded Samples',
    getXTitle: () => 'Mean TCGA Enrichment Score',
    getYTitle: () => 'Custom Enrichment Score',
    getColorScale: () => '',
  });

  constructor() {
    effect(() => {
      const prediction = this.predictService.prediction$();
      const selectedType = this.predictService.selectedPredictedType$();
      const selectedSamples = this.predictService.selectedSamples$();
      if (prediction && selectedType) {
        this.scatterplotParams.set({
          disease: selectedType,
          prediction,
          selectedSamples,
          timestamp: Date.now(),
        });
        this.updateScatterplotData().then(() => {
          this.refreshSignal.update(v => v + 1);
        });
      }
    });
  }

  async updateScatterplotData() {
    try {
      const prediction = this.predictService.prediction$();
      if (!prediction?.scores?.genes?.length) {
        this.transformedData.set([]);
        return;
      }
      const tcgaScores = await this.getTcgaSpongEffectsScores(prediction.scores.genes);
      if (!tcgaScores?.length) {
        this.transformedData.set([]);
        return;
      }
      const selectedSamples = this.predictService.selectedSamples$();
      const samples = prediction.scores.samples || [];
      const sampleIndices = selectedSamples.length > 0
        ? selectedSamples.map(s => samples.indexOf(s)).filter(idx => idx !== -1)
        : samples.map((_, idx) => idx);

      const level = this.predictService.level();

      // Build Map of Gene/Transcript ID -> { score: number, symbol: string }
      const tcgaMap = new Map<string, { score: number; symbol: string }>();
      for (const item of tcgaScores) {
        const id = level === 'gene' ? item.gene?.ensg_number : item.transcript?.enst_number;
        const symbol = level === 'gene' ? item.gene?.gene_symbol : item.transcript?.gene?.gene_symbol;
        if (id) {
          tcgaMap.set(id, { score: item.score_value || 0, symbol: symbol || id });
        }
      }

      const scatterData = prediction.scores.genes.map((gene: string, index: number) => {
        const scoresForGene = prediction.scores.values[index] || [];
        const selectedScores = sampleIndices.map(idx => scoresForGene[idx] ?? 0);
        const count = selectedScores.length;
        const meanCustomScore = count > 0 ? selectedScores.reduce((s, v) => s + v, 0) / count : 0;

        const tcgaInfo = tcgaMap.get(gene);
        return {
          id: tcgaInfo?.symbol || gene,
          x: tcgaInfo?.score ?? 0,
          y: meanCustomScore,
        };
      });
      this.transformedData.set(scatterData);
    } catch (e) {
      console.error('Error updating scatterplot data:', e);
      this.transformedData.set([]);
    }
  }

  async getTcgaSpongEffectsScores(genes: string[]): Promise<any[]> {
    const level = this.predictService.level();
    const version = this.versionsService.versionReadOnly()();
    // prediction.scores (the source of `genes` here) is always the pancancer-level module
    // enrichment, regardless of which model was selected for the prediction — so the TCGA
    // background lookup must use the 'pancancer' scope too, not the predicted/specified type.
    const disease = 'pancancer';
    if (!version || !genes.length) return [];
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

      if (!moduleIDs.length) return [];
      return await this.backend.fetchSpongEffectsEnrichScores(version, this.predictService.level(), moduleIDs, false, true) || [];
    } catch (e) {
      console.error('Error in getTcgaSpongEffectsScores:', e);
      return [];
    }
  }

  onTabChange(event: any) {
    const index = typeof event === 'number' ? event : event.index;
    this.selectedTabIndex.set(index);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }
}
