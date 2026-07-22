// Trigger watcher rebuild
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Dataset } from '../../../interfaces';
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
import { ImportancePlotComponent, symbolCache, ensureGeneSymbols } from '../explore/plots/lollipop-plot/lollipop-plot.component';
import { BrowseService } from '../../../services/browse.service';
import { PredictionResultsComponent } from '../predict/prediction-results/prediction-results.component';
import { PredictionTableComponent } from '../predict/prediction-results/prediction-table/prediction-table.component';
import { ModuleFormComponent } from '../explore/form/module-form/module-form.component';
import { ClassificationPlotComponent } from "../predict/classification-plot/classification-plot.component";
import { ScatterplotComponent, ScatterplotDataScource } from '../../../components/scatterplot/scatterplot.component';
import { BackendService } from '../../../services/backend.service';
import { VersionsService } from '../../../services/versions.service';
import { UmapPlotComponent } from '../predict/umap-plot/umap-plot.component';
import { InfoComponent } from '../../../components/info/info.component';

@Component({
  selector: 'app-spongeffects-scores',
  imports: [
    InfoComponent,
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
    ImportancePlotComponent,
    PredictionResultsComponent,
    PredictionTableComponent,
    ModuleFormComponent,
    ClassificationPlotComponent,
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
  selectedSubtype = signal<string>('');

  hasSubtypeScores$ = computed(() => {
    const prediction = this.predictService.prediction$();
    return !!(prediction as any)?.subtype_scores;
  });

  availableSubtypes$ = computed(() => {
    const scope = this.predictService.selectedScope$();
    const datasets = this.predictService.referenceDatasets$();
    if (!scope || scope === 'pancancer' || datasets.length === 0) return [];
    return datasets
      .filter((d: Dataset) => d.disease_name === scope && d.disease_subtype)
      .map((d: Dataset) => d.disease_subtype as string)
      .filter((value, index, self) => self.indexOf(value) === index);
  });

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
  isScatterplotLoading = signal<boolean>(false);
  scatterplotParams = signal<any>({});

  scatterplotDataSource = signal<ScatterplotDataScource>({
    getData: async (params: any) => {
      await this.updateScatterplotData(params?.showRemaining === true);
      return this.transformedData();
    },
    getTitle: () => 'Top ceRNA Modules for Uploaded Samples',
    getXTitle: () => 'Mean TCGA Enrichment Score',
    getYTitle: () => 'Custom Enrichment Score',
    getColorScale: () => '',
  });

  importancePlotVis = computed(() => {
    const subVis = this.selectedSubVis();
    return subVis === 'importance' ? 'plot' : subVis;
  });

  private tcgaScoresCache = new Map<string, any[]>();

  preloadOtherTabs = signal<boolean>(false);

  constructor() {
    // Progressive tab loading: trigger idle preloading of remaining tabs after active tab loads
    effect(() => {
      const activeLoading = this.browseService.isLoading$();
      if (!activeLoading && !this.preloadOtherTabs()) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => this.preloadOtherTabs.set(true));
        } else {
          setTimeout(() => this.preloadOtherTabs.set(true), 500);
        }
      }
    });

    // Sync selectedSubVis and selectedTabIndex to predictService so module-form can read them
    effect(() => {
      this.predictService.selectedVis$.set(this.selectedSubVis());
    });
    effect(() => {
      this.predictService.selectedTabIndex$.set(this.selectedTabIndex());
    });

    // Only fetch TCGA background scores when the scatterplot sub-tab is actually visible
    effect(() => {
      const prediction = this.predictService.prediction$();
      const selectedType = this.predictService.selectedScope$() || this.predictService.selectedPredictedType$() || 'pancancer';
      const selectedSamples = this.predictService.selectedSamples$();
      const tabIndex = this.selectedTabIndex();
      const subVis = this.selectedSubVis();

      const min1 = this.predictService.minScore1$();
      const min2 = this.predictService.minScore2$();
      const sortBy = this.predictService.sortBy$();
      const topN = this.predictService.topNModules$();
      const nodesLength = this.browseService ? this.browseService.nodes$().length : 0;

      if (prediction && tabIndex === 1 && subVis === 'scatterplot') {
        // Changing params reloads the scatterplot resource, which re-runs updateScatterplotData
        // via getData (with the current showRemaining). Don't call updateScatterplotData()
        // directly here — a second, showRemaining-unaware write would race with and clobber
        // the resource's write, which is what broke "Add remaining modules".
        this.scatterplotParams.set({
          disease: selectedType,
          prediction,
          selectedSamples,
          min1,
          min2,
          sortBy,
          topN,
          nodesLength,
          timestamp: Date.now(),
        });
      }
    });
  }

  async updateScatterplotData(showRemaining = false) {
    this.isScatterplotLoading.set(true);
    try {
      const prediction = this.predictService.prediction$();
      if (!prediction?.scores?.genes?.length) {
        this.transformedData.set([]);
        return;
      }

      const selectedSamples = this.predictService.selectedSamples$();
      const samples = prediction.scores.samples || [];
      const sampleIndices = selectedSamples.length > 0
        ? selectedSamples.map(s => samples.indexOf(s)).filter(idx => idx !== -1)
        : samples.map((_, idx) => idx);

      const level = this.predictService.level();

      // Calculate statistics for all modules first
      let modules = prediction.scores.genes.map((geneId: string, index: number) => {
        const scoresForGene = prediction.scores.values[index] || [];
        const selectedScores = sampleIndices.map(idx => scoresForGene[idx] ?? 0);
        const count = selectedScores.length;
        const mean = count > 0 ? selectedScores.reduce((s: number, v: number) => s + v, 0) / count : 0;
        const variance = count > 0
          ? selectedScores.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / count
          : 0;

        const symbol = symbolCache.get(geneId) || geneId;

        return {
          ensemblID: geneId,
          symbol,
          x: 0,
          y: mean,
          meanEnrichmentScore: mean,
          absMeanEnrichmentScore: Math.abs(mean),
          varianceEnrichmentScore: variance,
        };
      });

      // Fetch TCGA background x-values. Only the top-N are drawn red and always need values;
      // the remaining ("grey") modules are only drawn — and thus only need values — once the
      // user clicks "Add remaining modules" (showRemaining). Fetching just the top-N by default
      // keeps the initial load fast; fetching all on demand makes the grey points correct.
      const topN = this.predictService.topNModules$() || 15;
      const topModules = modules.slice(0, topN);
      const modulesToResolve = showRemaining ? modules : topModules;
      const geneIDsToFetch = modulesToResolve.map(m => m.ensemblID);

      const tcgaScores = await this.getTcgaSpongEffectsScores(geneIDsToFetch, showRemaining);

      const tcgaMap = new Map<string, { score: number; symbol: string }>();
      for (const item of tcgaScores) {
        const id = level === 'gene' ? item.gene?.ensg_number : item.transcript?.enst_number;
        const symbol = level === 'gene' ? item.gene?.gene_symbol : item.transcript?.gene?.gene_symbol;
        if (id) {
          tcgaMap.set(id, { score: item.score_value || 0, symbol: symbol || id });
        }
      }

      for (const m of modules) {
        const tcgaInfo = tcgaMap.get(m.ensemblID);
        if (tcgaInfo) {
          m.x = tcgaInfo.score;
          if (tcgaInfo.symbol) {
            m.symbol = symbolCache.get(m.ensemblID) || tcgaInfo.symbol;
          }
        }
      }

      // Resolve missing gene symbols for the resolved subset (batched, cached)
      await ensureGeneSymbols(this.backend, this.versionsService.versionReadOnly()(), modulesToResolve.map(m => m.ensemblID));

      // Map to scatterplot data items with isTop flag
      const scatterData = modules.map((m, idx) => ({
        id: symbolCache.get(m.ensemblID) || m.symbol,
        ensemblID: m.ensemblID,
        x: m.x,
        y: m.y,
        isTop: idx < topN,
      }));

      this.transformedData.set(scatterData);
    } catch (e) {
      console.error('Error updating scatterplot data:', e);
      this.transformedData.set([]);
    } finally {
      this.isScatterplotLoading.set(false);
    }
  }

  async getTcgaSpongEffectsScores(genes: string[], loadAll: boolean = false): Promise<any[]> {
    const level = this.predictService.level();
    const version = this.versionsService.versionReadOnly()();
    const disease = 'pancancer';
    if (!version || !genes.length) return [];
    const cacheKey = `${version}_${disease}_${level}_${loadAll ? 'all' : genes.join(',')}`;
    if (this.tcgaScoresCache.has(cacheKey)) {
      return this.tcgaScoresCache.get(cacheKey)!;
    }
    try {
      let res: any[] = [];
      if (loadAll) {
        // Direct call: No module IDs needed! Backend computes averages for ALL modules directly.
        res = await this.backend.fetchSpongEffectsEnrichScores(version, level, undefined, false, true) || [];
      } else {
        const idsParam = genes.join(',');
        let allModules: any[] = [];
        if (level === 'gene') {
          allModules = await this.backend.getSpongEffectsGeneModules(version, disease, undefined, undefined, idsParam);
        } else {
          allModules = await this.backend.getSpongEffectsTranscriptModules(version, disease, undefined, undefined, idsParam);
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
        res = await this.backend.fetchSpongEffectsEnrichScores(version, level, moduleIDs, false, true) || [];
      }
      this.tcgaScoresCache.set(cacheKey, res);
      return res;
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

  /**
   * A tab's content is instantiated once it is either the selected tab, or once background
   * preloading has kicked in (preloadOtherTabs, set on idle after the active tab finishes
   * loading). Combined with the tab-group's preserveContent, a tab stays mounted after its
   * first render, so its data is fetched at most once and switching back never refetches.
   */
  tabReady(index: number): boolean {
    return this.selectedTabIndex() === index || this.preloadOtherTabs();
  }
}
