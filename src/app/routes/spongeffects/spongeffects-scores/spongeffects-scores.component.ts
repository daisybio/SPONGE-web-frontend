// Trigger watcher rebuild
import { Component, computed, effect, inject, signal } from '@angular/core';
import { PredictFormComponent } from '../predict/form/predict-form.component';
import { PredictService } from '../predict/service/predict.service';
import { BrowseService } from '../../../services/browse.service';
import { NetworkComponent } from '../../../components/browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../../../components/browse-views/active-entities/active-entities.component';
import { DiseaseSelectorComponent } from '../../../components/disease-selector/disease-selector.component';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
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

@Component({
  selector: 'app-spongeffects-scores',
  imports: [
    PredictFormComponent,
    DiseaseSelectorComponent,
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
  ],
  providers: [BrowseService],
  templateUrl: './spongeffects-scores.component.html',
  styleUrl: './spongeffects-scores.component.scss',
})
export class SpongeffectsScoresComponent {
  predictService = inject(PredictService);
  browseService = inject(BrowseService);
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);

  refreshSignal = signal<number>(0);

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
      const networkData = this.predictService.moduleNetworkData$.value();
      this.browseService.setManualData(networkData);
    });

    effect(() => {
      const prediction = this.predictService.prediction$();
      const selectedType = this.predictService.selectedPredictedType$();
      if (prediction && selectedType) {
        this.scatterplotParams.set({
          disease: selectedType,
          prediction,
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
      const scatterData = prediction.scores.genes.map((gene: string, index: number) => ({
        id: tcgaScores[index]?.gene?.gene_symbol || gene,
        x: tcgaScores[index]?.score_value || 0,
        y: prediction.scores.values[index]?.[0] || 0,
      })).filter((item: any) => item.x !== undefined && item.y !== undefined);
      this.transformedData.set(scatterData);
    } catch (e) {
      console.error('Error updating scatterplot data:', e);
      this.transformedData.set([]);
    }
  }

  async getTcgaSpongEffectsScores(genes: string[]): Promise<any[]> {
    const level = this.predictService.level();
    const version = this.versionsService.versionReadOnly()();
    const disease = this.predictService.selectedPredictedType$();
    if (!disease || !version || !genes.length) return [];
    try {
      const BATCH_SIZE = 10;
      const fetchModules = async (gene: string) => {
        if (level === 'gene') {
          const modules = await this.backend.getSpongEffectsGeneModules(version, disease, undefined, undefined, gene);
          return modules.map((m: any) => m.spongEffects_gene_module_ID);
        } else {
          const modules = await this.backend.getSpongEffectsTranscriptModules(version, disease, undefined, undefined, gene);
          return modules.map((m: any) => m.spongEffects_transcript_module_ID);
        }
      };
      const results: number[][] = [];
      for (let i = 0; i < genes.length; i += BATCH_SIZE) {
        const batch = genes.slice(i, i + BATCH_SIZE);
        results.push(...await Promise.all(batch.map(fetchModules)));
      }
      const moduleIDs = results.flat();
      if (!moduleIDs.length) return [];
      return await this.backend.fetchSpongEffectsEnrichScores(version, this.predictService.level(), moduleIDs, false) || [];
    } catch (e) {
      console.error('Error in getTcgaSpongEffectsScores:', e);
      return [];
    }
  }

  onTabChange(event: any) {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }
}
