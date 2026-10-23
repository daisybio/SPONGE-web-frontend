import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  untracked,
  viewChild,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ɵunwrapWritableSignal
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';

import {
  Dataset,
  PlotlyData,
  SpongEffectsModule,
  SpongEffectsRun,
  ModuleMember,
  PredictCancerType,
  Gene,
  Transcript
} from '../../../../../interfaces';
import { BackendService, ModuleRanking } from '../../../../../services/backend.service';
import { SpongEffectsService } from '../../../../../services/spong-effects.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService, mergeRunModules } from '../../service/explore.service';
import { PredictService } from '../../../predict/service/predict.service';
import { InfoComponent } from '../../../../../components/info/info.component';
import { InfoService } from '../../../../../services/info.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { ReusableHeatmapComponent, HeatmapDataSource } from '../../../../../components/heatmap-plot/heatmap-plot.component';
import { ScatterplotComponent, ScatterplotDataScource } from '../../../../../components/scatterplot/scatterplot.component';
import { BrowseService } from '../../../../../services/browse.service';
import { PredictBrowseService } from '../../../../../services/predict.browse.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ModalsService } from '../../../../../components/modals-service/modals.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddToCartButtonComponent } from '../../../../../components/add-to-cart-button/add-to-cart-button.component';
import { CartService } from '../../../../../services/cart.service';
import { clusterMatrixOrders } from '../../../../../utils/hclust';

declare var Plotly: any;
export const symbolCache = new Map<string, string>();

/**
 * Populate symbolCache for any of `ids` not already resolved, with one batched request per ID
 * kind. Shared by every SpongEffects view that renders gene symbols so the same ids aren't
 * re-resolved per component. Transcripts (transcript-level modules) get their gene's symbol, as
 * in the Explore plots. Unresolved ids fall back to themselves.
 */
export async function ensureGeneSymbols(backend: BackendService, version: number, ids: string[]): Promise<void> {
  const missing = Array.from(new Set(ids.filter(id => id && !symbolCache.has(id))));
  if (missing.length === 0) return;
  const genes = missing.filter(id => !id.startsWith('ENST'));
  const transcripts = missing.filter(id => id.startsWith('ENST'));
  const resolved = new Map<string, string>();
  try {
    // Both endpoints answer "none found" with {detail, data: []} instead of an array, and
    // getGeneInformation knows no transcripts.
    if (genes.length > 0) {
      const response = await backend.getGeneInfo(version, genes.join(','));
      for (const r of Array.isArray(response) ? response : []) resolved.set(r.ensg_number, r.gene_symbol);
    }
    if (transcripts.length > 0) {
      const response: any = await backend.getTranscriptInfo(version, transcripts.join(','));
      for (const r of Array.isArray(response) ? response : []) {
        if (r?.enst_number && r.gene?.gene_symbol) resolved.set(r.enst_number, r.gene.gene_symbol);
      }
    }
  } catch {
    // keep what resolved; the rest fall back to their ids
  }
  for (const id of missing) symbolCache.set(id, resolved.get(id) || id);
}

@Component({
  selector: 'app-importance-plot',
  imports: [
    MatExpansionModule,
    MatMenuModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    MatGridListModule,
    MatTableModule,
    CommonModule,
    MatInputModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatSortModule,
    InfoComponent,
    MatButtonModule,
    ReusableHeatmapComponent,
    ScatterplotComponent,
    MatButtonToggleModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    AddToCartButtonComponent
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class ImportancePlotComponent implements OnInit, AfterViewInit, OnDestroy {
  private backend = inject(BackendService);
  private spongEffectsService = inject(SpongEffectsService);
  private versionService = inject(VersionsService);
  exploreService = inject(ExploreService, { optional: true });
  predictService = inject(PredictService, { optional: true });
  predictBrowseService = inject(PredictBrowseService, { optional: true });
  browseService = inject(BrowseService);
  infoService = inject(InfoService);
  modalsService = inject(ModalsService);

  openEntityDialog(ensemblID: string, symbol?: string) {
    if (ensemblID.startsWith('ENSG')) {
      this.modalsService.openNodeDialog({
        ensg_number: ensemblID,
        gene_symbol: symbol
      } as Gene);
    } else {
      this.modalsService.openNodeDialog({
        enst_number: ensemblID,
        gene: { gene_symbol: symbol || ensemblID, ensg_number: '' }
      } as Transcript);
    }
  }

  // Inputs
  source = input<'explore' | 'predict'>('explore');
  prediction = input<PredictCancerType | undefined>();
  selectedVisInput = input<string | undefined>();

  internalSelectedVis = signal<string>('plot');

  selectedVis = computed(() => {
    const inputVal = this.selectedVisInput();
    if (inputVal !== undefined) return inputVal;
    if (this.source() === 'predict') return 'plot';
    return this.exploreService ? this.exploreService.selectedVis() : this.internalSelectedVis();
  });

  changeVis(value: string) {
    if (this.source() !== 'predict' && this.exploreService) {
      this.exploreService.selectedVis.set(value);
    } else {
      this.internalSelectedVis.set(value);
    }
  }

  selectedHeatmapType = computed<'enrichment' | 'expression'>(() => {
    if (this.source() === 'predict') {
      return this.predictService ? this.predictService.selectedHeatmapType$() : 'enrichment';
    }
    return this.exploreService ? this.exploreService.selectedHeatmapType() : 'enrichment';
  });

  onHeatmapTypeChange(value: 'enrichment' | 'expression') {
    if (this.source() === 'predict' && this.predictService) {
      this.predictService.selectedHeatmapType$.set(value);
    } else if (this.exploreService) {
      this.exploreService.selectedHeatmapType.set(value);
    }
  }

  expressionLabel = computed(() => {
    const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
    return level === 'transcript' ? 'Transcript Expression' : 'Gene Expression';
  });

  selectedParamSets = computed(() => {
    if (this.source() === 'predict') return [];
    return Object.values(this.exploreService?.selectedParamSets$() || {});
  });

  refreshSignal$ = input();
  refresh$ = signal(0);

  isLoading$ = this.browseService.isLoading$;
  cartService = inject(CartService);

  lollipopPlot = viewChild<ElementRef>('lollipopPlot');
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private resizeObserver: ResizeObserver | null = null;

  formGroup = new FormGroup({
    topControl: new FormControl<number>(15, [Validators.min(3), Validators.max(100)]),
    includeModuleMembers: new FormControl<boolean>(false),
    sortBy: new FormControl<string>(''),
    filterMinScore1: new FormControl<number | null>(null),
    filterMinScore2: new FormControl<number | null>(null)
  });

  topN = signal<number | undefined>(15);
  includeModuleMembers = signal<boolean | null>(false);

  showRemaining = signal<boolean>(false);

  toggleRemaining() {
    this.showRemaining.set(!this.showRemaining());
  }

  get includeModuleMembersControl(): FormControl {
    return this.formGroup.get('includeModuleMembers') as FormControl;
  }

  sortBy$ = signal<string>('');
  minScore1$ = signal<number | null>(null);
  minScore2$ = signal<number | null>(null);

  defaultMarkerSize = 12;
  MAX_ELEMENTS = 100;

  // selectedVis is now a computed property

  columnNamesCenters$ = computed<{ [key: string]: string }>(() => {
    const result: { [key: string]: string } = this.source() === 'predict' ? {
      symbol: 'Symbol',
      ensemblID: 'Ensembl ID',
      meanEnrichmentScore: 'Mean Enrichment Score',
      varianceEnrichmentScore: 'Enrichment Score Variance',
      moduleParams: 'Module Parameters'
    } : {
      symbol: 'Symbol',
      ensemblID: 'Ensembl ID',
      meanAccuracyDecrease: 'Mean Accuracy Decrease',
      meanGiniDecrease: 'Mean Gini Decrease',
      moduleParams: 'Module Parameters'
    };
    return result;
  });

  displayedColumnsCenters$ = computed(() => {
    return Object.keys(this.columnNamesCenters$());
  });

  columnNamesMembers: { [key: string]: string } = {
    symbol: 'Symbol',
    ensemblID: 'Ensembl ID',
    moduleCenter: 'Module Center',
  };
  displayedColumnsMembers = Object.keys(this.columnNamesMembers);

  elementLimitWarning = signal(false);
  spongEffectRuns = new Map<number, SpongEffectsRun>();

  // Caching and symbol resolution for predict mode
  predictionModulesResource = resource({
    params: () => ({
      pred: this.prediction(),
      // Scope-aware score matrix: the pancancer `scores` for the pancancer scope, or
      // type_scores[scope] for a type scope — so the Mean-vs-Variance plot (and the table
      // enrichment columns joined from it) follow the "Score Scope" selector like the network does.
      scores: this.predictService?.activeScores$(),
      version: this.versionService.versionReadOnly()(),
      source: this.source(),
      selectedSamples: this.predictService?.selectedSamples$() ?? [],
      sortBy: this.predictService?.sortBy$(),
      topGenes: this.predictService?.topModules$().map((m) => m.gene) ?? [],
    }),
    loader: async ({ params }) => {
      const { pred, scores, version, source, selectedSamples, sortBy, topGenes } = params;
      if (source !== 'predict' || !pred || !scores || !scores.genes || !scores.values || !version) {
        return [];
      }

      const genes = scores.genes;
      const values = scores.values;
      const samples = scores.samples;
      const modules: SpongEffectsModule[] = [];

      // Map selected samples to indices
      const sampleIndices = selectedSamples.length > 0
        ? selectedSamples.map(s => samples.indexOf(s)).filter(idx => idx !== -1)
        : samples.map((_, idx) => idx);

      for (let i = 0; i < genes.length; i++) {
        const geneId = genes[i];
        const scoresForGene = values[i] || [];

        const selectedScores = sampleIndices.map(idx => scoresForGene[idx] ?? 0);

        const count = selectedScores.length;
        const sum = selectedScores.reduce((s: number, v: number) => s + v, 0);
        const mean = count > 0 ? sum / count : 0;
        const variance = count > 0
          ? selectedScores.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / count
          : 0;

        modules.push({
          ensemblID: geneId,
          symbol: geneId,
          meanGiniDecrease: 0,
          meanAccuracyDecrease: 0,
          meanEnrichmentScore: mean,
          absMeanEnrichmentScore: Math.abs(mean),
          varianceEnrichmentScore: variance,
          spongEffects_run_ID: 0,
          spongEffects_module_ID: 0
        });
      }

      let list = [...modules];
      if (sortBy) {
        list.sort((a, b) => {
          const valA = (a as any)[sortBy] ?? 0;
          const valB = (b as any)[sortBy] ?? 0;
          return valB - valA; // Descending
        });
      }

      // Resolve missing gene symbols ONLY for the top modules (batched, cached)
      await ensureGeneSymbols(this.backend, version, topGenes);

      list.forEach(m => {
        m.symbol = symbolCache.get(m.ensemblID) ?? m.ensemblID;
      });

      return list;
    }
  });

  // Loading state for the importance / mean-vs-variance PLOT view. It is fed only by the module
  // list, so it must NOT reflect the members table or the network (findAll) — those load
  // independently and would otherwise keep the plot's progress bar spinning long after it has
  // rendered.
  isPlotLoading = computed(() => {
    if (this.source() === 'predict') {
      return (
        this.predictionModulesResource.isLoading() ||
        (this.predictService?._prediction$.isLoading() ?? false)
      );
    }
    return this.lolipopPlotData.isLoading();
  });

  // Loading state for the centers/members tables, which mirror the network's nodes (findAll) and
  // the members resource in addition to the module list.
  isTableLoading = computed(() => {
    if (this.source() === 'predict') {
      return (
        this.predictionModulesResource.isLoading() ||
        this.tableMembersResource.isLoading() ||
        (this.predictService?._prediction$.isLoading() ?? false) ||
        (this.predictBrowseService?.isLoading$() ?? false)
      );
    }
    return (
      this.lolipopPlotData.isLoading() ||
      this.tableMembersResource.isLoading()
    );
  });

  allModules$ = computed(() => {
    if (this.source() === 'predict') {
      return this.predictionModulesResource.value() || [];
    } else {
      return this.lolipopPlotData.value() || [];
    }
  });


  filteredAndSortedModules$ = computed(() => {
    if (this.source() === 'predict') {
      // Exactly the patient network's centers (PredictService.topModules$, which applies the sort
      // and min-score filters), in its order
      const byID = new Map((this.predictionModulesResource.value() || []).map((m) => [m.ensemblID, m]));
      return (this.predictService?.topModules$() ?? []).flatMap((top) => byID.get(top.gene) ?? []);
    }

    // allModules$() is already sorted+filtered server-side (sort_by / min_mean_*_decrease — see
    // ModuleRanking), so no client-side re-filter/re-sort is needed here. Slicing still matters
    // when showRemaining() is on, since allModules$() is then the large "grey" candidate pool
    // and this getter's job is to pick out just the top N ("red") modules from its front.
    const topLimit = this.topN() || 15;
    return this.allModules$().slice(0, topLimit);
  });

  selectedModules$ = computed(() => {
    return this.filteredAndSortedModules$();
  });

  plotModules$ = computed(() => {
    if (this.showRemaining()) {
      if (this.source() === 'predict') {
        return this.predictionModulesResource.value() || [];
      } else {
        // allModules$() is the large candidate pool, already sorted+filtered server-side.
        return this.allModules$();
      }
    } else {
      return this.filteredAndSortedModules$();
    }
  });

  gProfilerUrl$ = computed(() => {
    const modules = this.selectedModules$();
    if (!modules || modules.length === 0) {
      return '';
    } else {
      const genes = modules.map(module => module.symbol || module.ensemblID);
      return `https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query=${genes.join(' ')}`;
    }
  });

  // the grey modules
  lolipopPlotData = resource({
    params: () => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.exploreService?.selectedDisease$(),
      level: this.exploreService?.level$(),
      topN: this.showRemaining() ? 10000 : (this.topN() ?? 15),
      selectedParamSets: this.exploreService?.selectedParamSets$(),
      source: this.source(),
      sortBy: this.sortBy$(),
      minScore1: this.minScore1$(),
      minScore2: this.minScore2$(),
    }),
    loader: ({ params }) => {
      const { version, cancer, level, topN, selectedParamSets, source, sortBy, minScore1, minScore2 } = params;
      if (source === 'predict') return Promise.resolve([]);
      if (!version || !cancer || !level || !selectedParamSets) {
        return Promise.resolve([]);
      }
      const ranking: ModuleRanking = {
        sortBy: sortBy === 'meanGiniDecrease' ? 'meanGiniDecrease' : 'meanAccuracyDecrease',
        minMeanAccuracyDecrease: minScore1,
        minMeanGiniDecrease: minScore2,
      };
      const greyModules = this.getLollipopData(version, cancer, level, topN, selectedParamSets, ranking);
      return greyModules;
    }
  });

  // the red modules
  get selectedModules() {
    return this.selectedModules$;
  }

  // Data source for reusable heatmap component
  heatmapDataSourceEnrich = signal<HeatmapDataSource>({
    getData: async (params) => {
      const { version, disease, level, modules } = params;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return [];
      }

      if (this.source() === 'predict') {
        const pred = this.prediction();
        // Scope-aware: pancancer `scores` or type_scores[scope] (same set the network/tables use),
        // so the heatmap switches with the "Score Scope" selector instead of staying pancancer.
        const scores = this.predictService?.activeScores$();
        if (!pred || !scores || !scores.genes || !scores.values) return [];

        const res: any[] = [];
        const finalGenes = modules.map((m: SpongEffectsModule) => m.ensemblID);
        const finalGenesSymbols = new Map(modules.map((m: SpongEffectsModule) => [m.ensemblID, m.symbol]));
        const allSamples = scores.samples;

        // Precompute O(1) lookups so the cell loop below is linear, not O(genes × samples ×
        // predictions): gene id -> row index, and sample id -> predicted subtype.
        const geneRowIndex = new Map<string, number>();
        scores.genes.forEach((g: string, i: number) => geneRowIndex.set(g, i));
        const subtypeBySample = new Map<string, string>();
        for (const d of ((pred.data ?? []) as any[])) {
          if (d?.sampleID) subtypeBySample.set(d.sampleID, d.typePrediction ?? 'Unknown');
        }

        // Restrict columns to the selected patients (left-hand filter); all samples if none.
        const selectedSamples: string[] = this.predictService?.selectedSamples$() ?? [];
        const sampleIdxs = selectedSamples.length > 0
          ? selectedSamples.map(s => allSamples.indexOf(s)).filter(i => i !== -1)
          : allSamples.map((_: string, i: number) => i);
        // Resolve each column's sample id + subtype once, not per cell.
        const columns = sampleIdxs.map((idx: number) => {
          const sample = allSamples[idx] ?? '';
          return { idx, sample, subtype: subtypeBySample.get(sample) ?? 'Unknown' };
        });

        // Cluster rows (modules) and columns (patients) like the backend does for Explore.
        const rowIDs: string[] = finalGenes.filter((id: string) => geneRowIndex.has(id));
        const clustered = this.clusterAxes(rowIDs, columns, (id, col) =>
          scores.values[geneRowIndex.get(id)!]?.[col.idx] ?? 0);

        for (const ensemblID of clustered.rows) {
          const geneIdx = geneRowIndex.get(ensemblID)!;

          const geneSymbol = finalGenesSymbols.get(ensemblID) || ensemblID;
          const scoresForGene = scores.values[geneIdx] || [];

          for (const col of clustered.cols) {
            res.push({
              id: geneSymbol,
              ensemblID,
              sample_ID: col.sample,
              score_value: scoresForGene[col.idx] ?? 0,
              disease_subtype: col.subtype
            });
          }
        }
        return res;
      }

      let elements: string[] = modules.map((m: { spongEffects_module_ID: any; }) => m.spongEffects_module_ID);

      // Check for element limit
      this.elementLimitWarning.set(false);
      if (this.MAX_ELEMENTS && elements.length > this.MAX_ELEMENTS) {
        elements = elements.slice(0, this.MAX_ELEMENTS);
        this.elementLimitWarning.set(true);
      }

      const enrichData = await this.backend.fetchSpongEffectsEnrichScores(version, level, elements);
      // Add disease subtype information
      if (disease === 'pancancer') {
        const mapping = await this.backend.getDiseaseFromSample();
        const tssMapping = mapping as Record<string, string>;
        for (const e of enrichData) {
          const sample_ID = e.sample_ID;
          if (!sample_ID) continue;
          const tssCode = sample_ID.split('-')[1];
          e.disease_subtype = tssMapping[tssCode] || 'Unknown';
        }
      } else {
        const sampleInformation = await this.backend.getSampleInfo(undefined, disease);
        const mapping: Record<string, string> = {};
        sampleInformation.forEach((sample) => {
          if (sample.sample_ID && sample.disease?.disease_subtype) {
            mapping[sample.sample_ID] = sample.disease.disease_subtype;
          }
        });

        for (const e of enrichData) {
          const sampleID = e.sample_ID;
          if (!sampleID) {
            e.disease_subtype = 'NA';
            continue;
          }
          const patientID = sampleID.split('-').slice(0, -1).join('-');
          e.disease_subtype = mapping[patientID] || 'NA';
        }
      }
      return enrichData;
    },

    getTitle: () => 'Enrichment Scores of Selected Modules',

    getYAxisTitle: () => {
      const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
      return `Module Center ${level === 'gene' ? 'Gene' : 'Transcript'}`;
    },

    getZAxisTitle: () => 'Enrichment<br>Score',

    getZMid: () => 0,

    getColorScale: () => '',

    // Explore: colour the subtype bar within the selected disease's hue family. Predict: the bar
    // encodes the predicted cancer type, so leave the parent undefined for canonical type colours.
    subtypeParentType: () => this.source() === 'predict' ? undefined : this.exploreService?.selectedDisease$(),
  });

  /**
   * Order a heatmap's rows and columns by hierarchical (Ward) clustering, as the backend does for
   * the Explore heatmaps. The patient-centric heatmaps are built client-side from the uploaded
   * data, so they must do it themselves. A single row has nothing to cluster against (the backend
   * skips that case too), so the original order is kept then.
   */
  private clusterAxes<R, C>(rows: R[], cols: C[], valueAt: (row: R, col: C) => number): { rows: R[]; cols: C[] } {
    if (rows.length < 2 || cols.length < 2) return { rows, cols };
    const matrix = rows.map((r) => cols.map((c) => valueAt(r, c)));
    const { rowOrder, colOrder } = clusterMatrixOrders(matrix);
    return { rows: rowOrder.map((i) => rows[i]), cols: colOrder.map((i) => cols[i]) };
  }

  // Recent Explore expression-heatmap results by ID set (max 5); see heatmapDataSourceExpr.
  private expressionCache = new Map<string, Promise<any[]>>();

  // Data source for reusable heatmap component
  heatmapDataSourceExpr = signal<HeatmapDataSource>({
    getData: async (params) => {
      const { version, disease, level, modules, includeMembers } = params;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return [];
      }

      // Predict: build the expression heatmap from the user's UPLOADED expression matrix
      // (the data the prediction was computed from), so genes and samples match the uploaded
      // data. Rows = selected module centers (+ members when the checkbox is on), columns =
      // the selected patients. This is the only expression source whose samples are the
      // uploaded samples — the TCGA expression table (used for explore below) does not contain
      // them.
      if (this.source() === 'predict') {
        // Rows = the network's module center(s), plus the network's displayed members only when
        // "Show module members" is on. Centers come from topModules$ (the list the network itself
        // is built from), NOT from the network's rendered nodes: with members off the network is
        // a lone center that the orphan filter hides, and the retained-last-nodes fallback in
        // stableNetworkNodes$ would then keep serving the old node list, members included. Member
        // rows still come from the network so they match its cap and filters; symbols are already
        // resolved there, so no member/symbol fetch and no separate MAX_ELEMENTS cap here.
        const networkNodes: any[] = (params.networkNodes ?? []);
        const nodeByID = new Map<string, any>(networkNodes.map((n: any) => [BrowseService.getNodeID(n), n]));
        const centerIDs: string[] = (this.predictService!.topModules$() as { gene: string }[]).map((m) => m.gene);
        const memberIDs: string[] = includeMembers
          ? networkNodes.filter((n: any) => !n.isCenter).map((n: any) => BrowseService.getNodeID(n))
          : [];
        const geneEntries = Array.from(new Set([...centerIDs, ...memberIDs])).map((id) => {
          const node = nodeByID.get(id);
          return { id, symbol: node ? this.nodeSymbol(node) : (symbolCache.get(id) ?? id) };
        });

        const { samples: allSamples, values } = await this.predictService!.getUploadedExpression();
        const selectedSamples: string[] = this.predictService?.selectedSamples$() ?? [];
        const sampleIdxs = selectedSamples.length > 0
          ? selectedSamples.map(s => allSamples.indexOf(s)).filter(i => i !== -1)
          : allSamples.map((_: string, i: number) => i);

        const pred = this.prediction();
        // sample id -> predicted subtype, resolved once (was an O(cells × predictions) find).
        const subtypeBySample = new Map<string, string>();
        for (const d of ((pred?.data ?? []) as any[])) {
          if (d?.sampleID) subtypeBySample.set(d.sampleID, d.typePrediction ?? 'Unknown');
        }
        const columns = sampleIdxs.map((idx: number) => {
          const sample = allSamples[idx] ?? '';
          return { idx, sample, subtype: subtypeBySample.get(sample) ?? 'Unknown' };
        });

        // Cluster rows (genes/transcripts) and columns (patients) like the backend does for Explore.
        const clustered = this.clusterAxes(geneEntries, columns, (g, col) => values.get(g.id)?.[col.idx] ?? 0);

        const res: any[] = [];
        for (const g of clustered.rows) {
          const row = values.get(g.id);
          for (const col of clustered.cols) {
            res.push({
              id: g.symbol,
              ensemblID: g.id,
              sample_ID: col.sample,
              expr_value: row ? (row[col.idx] ?? 0) : 0,
              disease_subtype: col.subtype,
            });
          }
        }
        return res;
      }

      // Explore: the network decides the member rows, so wait for it to settle rather than
      // querying a stale ID set mid-load (the heatmap reloads again once the nodes arrive).
      if (params.isLoading) return [];

      let elements: string[] = [];
      {
        elements = modules.map((m: { ensemblID: any; }) => m.ensemblID);
        if (includeMembers) {
          // Members = the Reference Network's displayed member nodes, not every stored member of
          // every module. The network already applies the "Max nodes" cap, the node filters and
          // the center-edge ranking, so the heatmap obeys the same limits (and the request stays
          // small) instead of asking the backend for up to MAX_ELEMENTS transcripts at once.
          const memberIDs = ((params.networkNodes ?? []) as any[])
            .filter((n: any) => !n.isCenter)
            .map((n: any) => BrowseService.getNodeID(n));
          elements = Array.from(new Set([...elements, ...memberIDs]));
        }
      }

      // Check for element limit
      this.elementLimitWarning.set(false);
      if (this.MAX_ELEMENTS && elements.length > this.MAX_ELEMENTS) {
        elements = elements.slice(0, this.MAX_ELEMENTS);
        this.elementLimitWarning.set(true);
      }
      const dataset_ID = this.source() === 'predict'
        ? this.predictService?.selectedScopeDataset$()?.dataset_ID
        : this.exploreService?.selectedDiseaseObject$()?.dataset_ID;
      if (dataset_ID === undefined) return [];

      // The heatmap component is destroyed/recreated on every view or toggle switch and reloads on
      // each network change, so remember recent results (in-flight requests included) per ID set.
      const cacheKey = [version, dataset_ID, disease, level, [...elements].sort().join(',')].join('|');
      const cached = this.expressionCache.get(cacheKey);
      if (cached) return cached;

      const load = (async () => {
        const expressionData = await this.backend.fetchExpressionData(version, elements, dataset_ID, disease, level);

        // Add disease subtype information
        if (disease === 'pancancer') {
          const mapping = await this.backend.getDiseaseFromSample();
          for (const e of expressionData) {
            const sample_ID = e.sample_ID;
            const diseaseName = await this.mapSampleToDisease(sample_ID, mapping);
            e.disease_subtype = diseaseName;
          }
        } else {
          const sampleInformation = await this.backend.getSampleInfo(undefined, disease);
          const mapping: { [key: string]: string } = {};
          sampleInformation.forEach((sample) => {
            const sampleID = sample.sample_ID;
            mapping[sampleID] = sample.disease.disease_subtype;
          });
          for (const e of expressionData) {
            const patientID = e.sample_ID.split('-').slice(0, -1).join('-');
            e.disease_subtype = mapping[patientID] || 'NA';
          }
        }
        return expressionData;
      })();

      this.expressionCache.set(cacheKey, load);
      if (this.expressionCache.size > 5) {
        this.expressionCache.delete(this.expressionCache.keys().next().value!);
      }
      try {
        const data = await load;
        // Failed requests are swallowed into [], so never cache an empty result.
        if (data.length === 0) this.expressionCache.delete(cacheKey);
        return data;
      } catch (e) {
        this.expressionCache.delete(cacheKey);
        throw e;
      }
    },

    getTitle: (params) => {
      const { includeMembers } = params;
      return 'Expression of Selected Modules' + (includeMembers ? ' and Members' : '');
    },

    getYAxisTitle: () => {
      const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
      const includeMembers = this.source() === 'predict'
        ? (this.predictService?.includeModuleMembers$() ?? false)
        : (this.exploreService?.includeModuleMembers() ?? false);
      return `Module Center ${level === 'gene' ? 'Gene' : 'Transcript'}${includeMembers ? ' and Module Members' : ''}`;
    },

    getZAxisTitle: () => {
      const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
      return `${level === 'gene' ? 'Gene' : 'Transcript'}<br>Expression`;
    },

    getZMid: () => 0,

    getColorScale: () => 'RdBu',

    // Explore: colour the subtype bar within the selected disease's hue family. Predict: the bar
    // encodes the predicted cancer type, so leave the parent undefined for canonical type colours.
    subtypeParentType: () => this.source() === 'predict' ? undefined : this.exploreService?.selectedDisease$(),
  });

  // Parameters for the heatmaps
  heatmapParamsEnrich = computed(() => {
    const version = this.versionService.versionReadOnly()();
    const disease = this.source() === 'predict'
      ? (this.predictService?.selectedScope$())
      : this.exploreService?.selectedDisease$();
    const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();

    // The selected modules (left-hand filter), same set as the dotplot/scatterplot.
    const modules = this.selectedModules$();

    return {
      version,
      disease,
      level,
      modules,
      // Included so the heatmap re-renders when the patient/sample selection changes; the
      // predict data source filters the score matrix to these samples.
      selectedSamples: this.predictService?.selectedSamples$() ?? [],
      includeMembers: false,
      value_key: 'score_value',
      // Show the spinner while the module centers this heatmap plots are still being resolved.
      isLoading: this.source() === 'predict' ? this.predictionModulesResource.isLoading() : false,
    };
  });

  // Explore: per-module enrichment mean vs variance across the reference (TCGA) samples.
  // Fetches per-sample enrichment scores for the selected modules and aggregates them, so each
  // point is a module: x = mean enrichment score, y = variance of that score across samples.
  enrichmentMeanVarDataSource: ScatterplotDataScource = {
    getData: async (params: any) => {
      const { version, disease, level, topModules, selectedParamSets, showRemaining } = params;
      if (!version || !level) return [];
      const topList: SpongEffectsModule[] = topModules ?? [];
      const topIDs = new Set(topList.map((m) => m.ensemblID));

      // "Add remaining modules" (the scatterplot's own toggle) — fetch the FULL module list so the
      // non-top-N modules can be plotted as grey points; otherwise plot just the top-N.
      let modules: SpongEffectsModule[] = topList;
      if (showRemaining && disease && selectedParamSets) {
        try {
          const ranking: ModuleRanking = {
            sortBy: this.sortBy$() === 'meanGiniDecrease' ? 'meanGiniDecrease' : 'meanAccuracyDecrease',
            minMeanAccuracyDecrease: this.minScore1$(),
            minMeanGiniDecrease: this.minScore2$(),
          };
          modules = await this.getLollipopData(version, disease, level, 10000, selectedParamSets, ranking);
        } catch { modules = topList; }
      }
      if (modules.length === 0) return [];

      const moduleIDs = modules.map((m) => m.spongEffects_module_ID);
      // average=true → the backend returns ONE row per module with the mean (score_value) and
      // variance (variance_score) computed in SQL. average=false returns EVERY per-sample score
      // (millions of rows / hundreds of MB for the full module set) that we'd only aggregate here.
      // Cached (by sorted module-ID set) so changing "max modules" while all modules are already
      // shown re-colours top-N vs remaining WITHOUT re-hitting getSpongEffectsGeneModuleScores.
      const enrichData = await this.spongEffectsService.getEnrichScores(version, level, moduleIDs, false, true);
      const points: any[] = [];
      for (const e of enrichData as any[]) {
        const ensemblID = level === 'gene' ? e.gene?.ensg_number : e.transcript?.enst_number;
        if (!ensemblID) continue;
        const symbol = (level === 'gene'
          ? e.gene?.gene_symbol
          : (e.transcript?.gene?.gene_symbol ?? e.transcript?.enst_number)) ?? ensemblID;
        // isTop drives the scatterplot's red (top-N) vs grey (remaining) split.
        points.push({ id: symbol, ensemblID, x: e.score_value ?? 0, y: e.variance_score ?? 0, isTop: topIDs.has(ensemblID) });
      }
      return points;
    },
    getTitle: () => 'Enrichment: Mean vs Variance',
    getXTitle: () => 'Mean Enrichment Score',
    getYTitle: () => 'Enrichment Score Variance',
    getColorScale: () => '',
  };

  enrichmentScatterParams = computed(() => ({
    version: this.versionService.versionReadOnly()(),
    disease: this.exploreService?.selectedDisease$(),
    level: this.exploreService?.level$(),
    topModules: this.selectedModules$(),
    selectedParamSets: this.exploreService?.selectedParamSets$(),
  }));

  // Explore only. Max. nodes fires on every keystroke and each distinct member-ID set is a slow,
  // clustered backend expression request, so let the network's nodes settle before the heatmap
  // reacts (typing "30" would otherwise first request a 3-node heatmap).
  private readonly settledExploreNodes$ = toSignal(
    toObservable(this.browseService.nodes$).pipe(debounceTime(400)),
    { initialValue: this.browseService.nodes$() as any[] }
  );

  heatmapParamsExpr = computed(() => {
    const version = this.versionService.versionReadOnly()();
    const disease = this.source() === 'predict'
      ? (this.predictService?.selectedScope$())
      : this.exploreService?.selectedDisease$();
    const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();

    // Selected modules (left-hand filter), same set as the dotplot/scatterplot.
    const modules = this.selectedModules$();

    const isPredict = this.source() === 'predict';
    const includeMembers = isPredict
      ? (this.predictService?.includeModuleMembers$() ?? false)
      : (this.exploreService?.includeModuleMembers() ?? false);
    // Explore reads the network only when members are shown, so toggling members off does not
    // make the heatmap depend on (and reload with) every network change.
    const exploreNetworkNodes = !isPredict && includeMembers ? this.settledExploreNodes$() : [];

    return {
      version,
      disease,
      level,
      modules,
      // Re-render when the patient selection changes (predict data source filters to these).
      selectedSamples: this.predictService?.selectedSamples$() ?? [],
      includeMembers,
      // The network's rendered nodes drive the heatmap's member rows (same genes, cap and filters
      // as the network); reloads the heatmap when the network changes. Predict also takes its
      // centers from here, Explore takes them from `modules`.
      networkNodes: isPredict ? this.stableNetworkNodes$() : exploreNetworkNodes,
      // Surface the upstream network load so the heatmap shows its spinner while the nodes this
      // heatmap depends on are still being fetched (getData would otherwise return empty fast).
      isLoading: isPredict
        ? (this.predictBrowseService?.isLoading$() ?? false)
        : (includeMembers ? this.browseService.isLoading$() : false),
    };
  });

  // The patient-specific network's rendered nodes/edges. They read as empty while the network
  // reloads, so the last value is kept until the reload finishes and the tables and heatmap don't
  // blank in between; a network that is empty once loaded (e.g. every node filtered out) shows as
  // empty instead of keeping the previous network's rows. Predict mode only; null service in explore.
  private readonly stableNetworkNodes$ = linkedSignal<{ nodes: any[]; loading: boolean }, any[]>({
    source: () => ({
      nodes: (this.predictBrowseService?.nodes$() ?? []) as any[],
      loading: this.predictBrowseService?.isLoading$() ?? false,
    }),
    computation: ({ nodes, loading }, prev) => (nodes.length > 0 || !loading ? nodes : (prev?.value ?? [])),
  });
  private readonly stableNetworkEdges$ = linkedSignal<{ edges: any[]; loading: boolean }, any[]>({
    source: () => ({
      edges: (this.predictBrowseService?.interactions$() ?? []) as any[],
      loading: this.predictBrowseService?.isLoading$() ?? false,
    }),
    computation: ({ edges, loading }, prev) => (edges.length > 0 || !loading ? edges : (prev?.value ?? [])),
  });

  private nodeSymbol(n: any): string {
    const id = BrowseService.getNodeID(n);
    return n?.gene?.gene_symbol ?? n?.transcript?.gene?.gene_symbol ?? symbolCache.get(id) ?? id;
  }

  /** Map each displayed member node to the center it connects to (via the network edges). */
  private memberCenterMap(nodes: any[], edges: any[]): Map<string, any> {
    const centers = nodes.filter((n) => n.isCenter);
    const centerIDs = new Set(centers.map((c) => BrowseService.getNodeID(c)));
    const byId = new Map(centers.map((c) => [BrowseService.getNodeID(c), c]));
    const result = new Map<string, any>();
    for (const int of edges as any[]) {
      const [a, b] = 'gene1' in int
        ? [int.gene1.ensg_number, int.gene2.ensg_number]
        : [int.transcript_1.enst_number, int.transcript_2.enst_number];
      if (centerIDs.has(a) && !centerIDs.has(b) && !result.has(b)) result.set(b, byId.get(a));
      else if (centerIDs.has(b) && !centerIDs.has(a) && !result.has(a)) result.set(a, byId.get(b));
    }
    // Fall back to the sole/first center for members with no explicit center edge.
    const fallback = centers[0];
    for (const n of nodes) {
      const id = BrowseService.getNodeID(n);
      if (!n.isCenter && !result.has(id)) result.set(id, fallback);
    }
    return result;
  }

  tableCenters$ = computed<MatTableDataSource<any>>(() => {
    // Predict: show exactly the network's center node(s), so the table matches the network.
    // Enrichment-score columns are joined in from the prediction modules by ensembl ID.
    if (this.source() === 'predict') {
      const nodes = this.stableNetworkNodes$();
      const scoreByID = new Map<string, SpongEffectsModule>();
      for (const m of (this.predictionModulesResource.value() ?? [])) {
        scoreByID.set(m.ensemblID, m);
      }
      const tableEntries = nodes
        .filter((n) => n.isCenter)
        .map((n) => {
          const id = BrowseService.getNodeID(n);
          const meta = scoreByID.get(id);
          return {
            ensemblID: id,
            symbol: this.nodeSymbol(n),
            meanEnrichmentScore: meta?.meanEnrichmentScore ?? 0,
            absMeanEnrichmentScore: meta?.absMeanEnrichmentScore ?? 0,
            varianceEnrichmentScore: meta?.varianceEnrichmentScore ?? 0,
            spongEffects_run_ID: 0,
            spongEffects_module_ID: 0,
            moduleParams: 'Custom Prediction',
          };
        });
      const dataSource = new MatTableDataSource(tableEntries);
      if (this.paginator && this.sort) {
        dataSource.paginator = this.paginator;
        dataSource.sort = this.sort;
      }
      return dataSource;
    }

    const modules = this.selectedModules$();
    const tableEntries = modules.map(module => ({
      ...module,
      moduleParams: this.spongEffectsRunParamsString(module.spongEffects_run_ID)
    }));
    const dataSource = new MatTableDataSource(tableEntries);
    if (this.paginator && this.sort) {
      dataSource.paginator = this.paginator;
      dataSource.sort = this.sort;
    }
    return dataSource;
  });

  get tableCentersResource() {
    return {
      value: () => this.tableCenters$()
    };
  }

  tableMembersResource = resource({
    params: () => ({
      modules: this.selectedModules$(),
      source: this.source(),
      version: this.versionService.versionReadOnly()(),
      disease: this.source() === 'predict'
        ? (this.predictService?.selectedScope$())
        : this.exploreService?.selectedDisease$(),
      level: this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$(),
      // Predict: the exact member nodes the network renders (retained across reloads).
      networkNodes: this.source() === 'predict' ? this.stableNetworkNodes$() : [],
      networkEdges: this.source() === 'predict' ? this.stableNetworkEdges$() : [],
    }),
    loader: async ({ params }) => {
      const { modules, source, version, disease, level, networkNodes, networkEdges } = params;

      if (source === 'predict') {
        // Show exactly the network's displayed members (non-center nodes), so the table and the
        // patient-specific network always agree on which members are shown.
        const centerMap = this.memberCenterMap(networkNodes, networkEdges);
        const allMembers: ModuleMember[] = networkNodes
          .filter((n) => !n.isCenter)
          .map((n) => {
            const center = centerMap.get(BrowseService.getNodeID(n));
            return {
              ensemblID: BrowseService.getNodeID(n),
              symbol: this.nodeSymbol(n),
              moduleCenter: center ? this.nodeSymbol(center) : '-',
              moduleCenterID: center ? BrowseService.getNodeID(center) : '',
              spongEffects_run_ID: 0,
              moduleParams: 'Custom Prediction',
            } as ModuleMember;
          });
        return new MatTableDataSource(allMembers);
      }

      if (modules.length === 0 || !version || !disease || !level) {
        return new MatTableDataSource<ModuleMember>([]);
      }

      {
        const fetchPromises = modules.map(async module => {
          const key = this.exploreService!.getModuleKey(module);
          if (!this.exploreService!.moduleMembersMap.has(key)) {
            await this.exploreService!.fetchModuleMembers(module);
          }
        });
        await Promise.all(fetchPromises);

        const allMembers: ModuleMember[] = [];
        for (const module of modules) {
          const key = this.exploreService!.getModuleKey(module);
          const members = this.exploreService!.moduleMembersMap.get(key) || [];
          allMembers.push(...members.map(m => ({
            ...m,
            moduleCenterID: module.ensemblID,
            moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID)
          })));
        }
        return new MatTableDataSource(allMembers);
      }
    }
  });

  ngOnInit() {
    // Inputs are bound from here on. In the constructor source() is still its default ('explore'),
    // which made the Scores page's instance share, and then overwrite, the Explore page's state.
    if (this.source() === 'explore' && this.exploreService) {
      this.topN = this.exploreService.topN;
      this.includeModuleMembers = this.exploreService.includeModuleMembers;
      this.MAX_ELEMENTS = this.exploreService.MAX_ELEMENTS;
      this.sortBy$ = this.exploreService.sortBy;
      this.minScore1$ = this.exploreService.minScore1;
      this.minScore2$ = this.exploreService.minScore2;
    } else if (this.source() === 'predict' && this.predictService) {
      this.includeModuleMembers = this.predictService.includeModuleMembers$;
    }

    if (this.source() === 'predict') {
      this.formGroup.get('sortBy')?.setValue('absMeanEnrichmentScore', { emitEvent: false });
      this.sortBy$.set('absMeanEnrichmentScore');
    } else {
      // Keep a sort the user already chose on the Explore page
      const sortBy = this.sortBy$() || 'meanAccuracyDecrease';
      this.formGroup.get('sortBy')?.setValue(sortBy, { emitEvent: false });
      this.sortBy$.set(sortBy);
    }
  }

  // Guards the background expression-matrix preload to run once per prediction.
  private _expressionPreloadedFor: unknown = null;

  constructor() {
    this.initializeSpongEffectRuns();
    this.setupEffects();

    // As soon as the current view has finished loading, warm the uploaded expression matrix in
    // the background (predict only). It is the fetch+parse behind the expression heatmap and is
    // independent of the module selection, so opening Heatmaps → Expression then renders without
    // a load wait. `source()` is read inside the effect because signal inputs are not yet bound
    // in the constructor. Re-arms per prediction (a new upload clears predictService's cache).
    effect(() => {
      if (this.source() !== 'predict' || !this.predictService) return;
      const prediction = this.predictService.prediction$();
      const stillLoading = this.isTableLoading();
      if (!prediction || stillLoading) return;
      if (this._expressionPreloadedFor === prediction) return;
      this._expressionPreloadedFor = prediction;
      const preload = () => { this.predictService!.getUploadedExpression().catch(() => {}); };
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(preload);
      } else {
        setTimeout(preload, 300);
      }
    });

    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.topN.set(value ? value : undefined);
    });
    this.formGroup.get('includeModuleMembers')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.includeModuleMembers.set(value || false);
    });
    this.formGroup.get('sortBy')?.valueChanges.pipe(debounceTime(100)).subscribe((value) => {
      this.sortBy$.set(value || '');
    });
    this.formGroup.get('filterMinScore1')?.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.minScore1$.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
    });
    this.formGroup.get('filterMinScore2')?.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.minScore2$.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
    });
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => {
      this.refreshPlotSizes();
    });
    const el = this.lollipopPlot()?.nativeElement;
    if (el) {
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.clearAll();
  }

  private setupEffects(): void {
    effect(() => {
      const value = this.includeModuleMembers();
      if (this.formGroup.get('includeModuleMembers')?.value !== value) {
        this.formGroup.get('includeModuleMembers')?.setValue(value || false, { emitEvent: false });
      }
      const topN = this.topN();
      if (this.formGroup.get('topControl')?.value !== topN) {
        this.formGroup.get('topControl')?.setValue(topN ?? null, { emitEvent: false });
      }
    });

    effect(() => {
      this.refreshSignal$();
      this.refreshPlotSizes();
    });

    effect(() => {
      if (this.source() === 'explore' && this.exploreService) {
        this.exploreService.selectedDisease$();
        this.exploreService.level$();
      }
      // Untracked: clearAll() reads the lollipopPlot view-child signal, which only exists in the
      // 'plot' view. Tracking it re-ran this effect on every plot<->other view switch and wiped
      // moduleMembersMap, so the heatmap then found no members.
      untracked(() => this.clearAll());
    });

    effect(() => {
      const vis = this.selectedVis();
      if (vis === 'network') {
        setTimeout(() => {
          this.refresh$.update(v => v + 1);
        }, 100);
      }
    });

    effect(() => {
      if (this.source() === 'predict' && this.predictBrowseService) {
        // Mirror the already-computed patient-specific network from the parent
        // PredictBrowseService instance into this component's own BrowseService.
        this.browseService.setManualData({
          nodes: this.predictBrowseService.nodes$(),
          inverseNodes: this.predictBrowseService.inverseNodes$(),
          edges: this.predictBrowseService.interactions$(),
          disease: this.predictBrowseService.disease$(),
        });
      }
    });

    effect(() => {
      const modules = this.plotModules$();
      const topModules = this.selectedModules$();
      const vis = this.selectedVis();
      if (vis === 'plot' && modules && modules.length > 0) {
        setTimeout(() => {
          this.renderLollipopPlot(modules, topModules);
        });
      }
    });

    // Wire paginator/sort to whichever table is currently shown. The centers and members
    // tables live in mutually-exclusive @if blocks and share a single @ViewChild paginator/
    // sort, so we (a) depend on selectedVis() to re-run on view switch and (b) defer with a
    // microtask so the @ViewChild has resolved to the freshly-rendered table's controls.
    effect(() => {
      const vis = this.selectedVis();
      const table = this.tableCenters$();
      if (vis === 'centers' && table) {
        setTimeout(() => {
          if (this.paginator) table.paginator = this.paginator;
          if (this.sort) table.sort = this.sort;
        });
      }
    });

    effect(() => {
      const vis = this.selectedVis();
      const table = this.tableMembersResource.value();
      if (vis === 'members' && table) {
        setTimeout(() => {
          if (this.paginator) table.paginator = this.paginator;
          if (this.sort) table.sort = this.sort;
        });
      }
    });

    effect(() => {
      if (this.source() === 'explore' && this.exploreService) {
        if ((this.selectedModules$().length ?? 0) === 0 && this.lolipopPlotData && (this.lolipopPlotData.value()?.length ?? 0) > 0) {
          this.exploreService.selectedModules.reload();
        }
      }
    });
  }

  private async initializeSpongEffectRuns(): Promise<void> {
    const version = this.versionService.versionReadOnly()();
    if (version) {
      const runs = await this.backend.getSpongEffectsRuns(version);
      runs.forEach(run => {
        this.spongEffectRuns.set(run.spongEffects_run_ID, run);
      });
    }
  }

  private lollipopDataCache = new Map<string, SpongEffectsModule[]>();

  private async getLollipopData(version: number, cancer: string, level: string, topN: number, selectedParamSets: { [key: string]: any }, ranking: ModuleRanking): Promise<SpongEffectsModule[]> {
    // Cache the resolved module list (with enrichment metrics) so re-deriving a plot after a
    // "max modules" change — while all modules are already shown — is a pure cache hit: no
    // getSpongEffectsGeneModules AND no getSpongEffectsGeneModuleScores request, just a re-colour.
    const cacheKey = `${version}|${cancer}|${level}|${topN}|${JSON.stringify(selectedParamSets)}|${JSON.stringify(ranking)}`;
    const cachedData = this.lollipopDataCache.get(cacheKey);
    if (cachedData) return cachedData;

    // sort_by / min_mean_*_decrease are applied server-side (see ModuleRanking) so `topN` is the
    // true top-N under the active sort+filter, not a re-sort of a differently-ordered, already-
    // truncated response.
    let data: SpongEffectsModule[] = [];
    if (level === 'gene') {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        let tmp = await this.backend.getSpongEffectsGeneModules(version, cancer, paramSet, topN, undefined, undefined, ranking)
        tmp.map((entry) => {
          data.push({
            ensemblID: entry.gene.ensg_number,
            symbol: entry.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_gene_module_ID
          })
        }
        );
      };
    } else {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        let tmp = await this.backend.getSpongEffectsTranscriptModules(version, cancer, paramSet, topN, undefined, undefined, ranking);
        tmp.slice(0, topN).forEach(entry => {
          data.push({
            ensemblID: entry.transcript.enst_number,
            symbol: entry.transcript.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_transcript_module_ID
          });
        });
      }
    }
    // One ranking across the selected runs, as for the Reference Network's centers
    // (ExploreService.selectedModules): otherwise the first N here are run 1's top modules and the
    // plots mark different modules as top than the network shows
    data = mergeRunModules(data, ranking.sortBy ?? 'meanAccuracyDecrease');

    // Attach enrichment metrics (mean / abs-mean / variance across the reference TCGA samples) so
    // the drawer can sort modules by them, mirroring the predict view. Uses average=true (mean +
    // variance computed in SQL, cached) — NOT average=false, which returns every per-sample score
    // (millions of rows / hundreds of MB). Best-effort: on failure the modules lack these fields.
    try {
      const moduleIDs = data.map(m => m.spongEffects_module_ID).filter((id): id is number => id != null);
      if (moduleIDs.length > 0) {
        const enrich = await this.spongEffectsService.getEnrichScores(version, level as 'gene' | 'transcript', moduleIDs, false, true);
        const byId = new Map<string, { mean: number; variance: number }>();
        for (const e of enrich as any[]) {
          const id = level === 'gene' ? e.gene?.ensg_number : e.transcript?.enst_number;
          if (id) byId.set(id, { mean: e.score_value ?? 0, variance: e.variance_score ?? 0 });
        }
        for (const m of data) {
          const s = byId.get(m.ensemblID);
          if (s) {
            m.meanEnrichmentScore = s.mean;
            m.absMeanEnrichmentScore = Math.abs(s.mean);
            m.varianceEnrichmentScore = s.variance;
          }
        }
      }
    } catch (e) {
      console.error('Failed to attach enrichment metrics to explore modules:', e);
    }

    this.lollipopDataCache.set(cacheKey, data);
    return data;
  }

  private mapSampleToDisease(sample_ID: string, mapping: { [key: string]: string }): string {
    // a sample ID has the form TCGA-K1-A6RT-01___pancancer. Extract the TSS code which is in this case K1
    const tssCode = sample_ID.split('-')[1];
    // use the mapping to get the disease name
    const diseaseName = mapping[tssCode];
    if (diseaseName) {
      return diseaseName;
    } else {
      return 'Unknown';
    }
  }

  private async getCentersForTable(modules: SpongEffectsModule[]): Promise<MatTableDataSource<SpongEffectsModule>> {
    const tableEntries: SpongEffectsModule[] = modules.map(module => ({
      ...module,
      moduleParams: this.spongEffectsRunParamsString(module.spongEffects_run_ID)
    }));
    return new MatTableDataSource(tableEntries);
  }

  private async getMembersForTable(
    modules: SpongEffectsModule[],
  ): Promise<MatTableDataSource<ModuleMember>> {
    if (!this.exploreService) {
      return new MatTableDataSource<ModuleMember>([]);
    }
    const fetchPromises = modules.map(async module => {
      const key = this.exploreService!.getModuleKey(module);
      if (!this.exploreService!.moduleMembersMap.has(key)) {
        await this.exploreService!.fetchModuleMembers(module);
      }
    });

    await Promise.all(fetchPromises);

    const allMembers: ModuleMember[] = [];
    for (const module of modules) {
      const key = this.exploreService!.getModuleKey(module);
      const members = this.exploreService!.moduleMembersMap.get(key) || [];

      allMembers.push(...members.map(m => ({
        ...m,
        moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID)
      })));
    }
    return new MatTableDataSource(allMembers);
  }

  private renderLollipopPlot(limitedData: SpongEffectsModule[], topModules: SpongEffectsModule[]): void {
    console.log('renderLollipopPlot called with:', limitedData.length, 'modules,', topModules.length, 'top');
    const isPredict = this.source() === 'predict';
    // Red marks the top modules (the network's centers) by identity, not position: with "show
    // remaining" the list holds every module in rank order and the min-score filters don't apply
    // to it, so its first N are not necessarily the top modules.
    const topIDs = new Set(topModules.map((m) => m.ensemblID));
    const greyData = limitedData.filter((m) => !topIDs.has(m.ensemblID));
    const redData = limitedData.filter((m) => topIDs.has(m.ensemblID));

    const data = [
      {
        x: isPredict ? greyData.map(g => g.meanEnrichmentScore ?? 0) : greyData.map(g => g.meanGiniDecrease),
        y: isPredict ? greyData.map(g => g.varianceEnrichmentScore ?? 0) : greyData.map(g => g.meanAccuracyDecrease),
        mode: 'markers',
        type: 'scatter',
        name: 'Other Modules',
        text: greyData.map(g => `${g.symbol}<br>Click to add to selection`),
        customdata: greyData.map(g => ({ ensemblID: g.ensemblID, symbol: g.symbol })),
        marker: {
          size: this.defaultMarkerSize,
          color: 'grey',
          opacity: 0.5
        }
      },
      {
        x: isPredict ? redData.map(g => g.meanEnrichmentScore ?? 0) : redData.map(g => g.meanGiniDecrease),
        y: isPredict ? redData.map(g => g.varianceEnrichmentScore ?? 0) : redData.map(g => g.meanAccuracyDecrease),
        mode: 'markers',
        type: 'scatter',
        name: 'Top Modules',
        text: redData.map(g => `${g.symbol}<br>Click to add to selection`),
        customdata: redData.map(g => ({ ensemblID: g.ensemblID, symbol: g.symbol })),
        marker: {
          size: this.defaultMarkerSize,
          color: 'red',
          opacity: 1
        }
      }
    ];

    const layout = {
      title: isPredict ? 'Enrichment: Mean vs Variance' : 'Module Importance',
      showlegend: false,
      autosize: true,
      hovermode: 'closest',
      margin: {
        t: 30,
      },
      xaxis: {
        title: isPredict ? 'Mean ceRNA Enrichment Score' : 'Mean Decrease in Gini Index'
      },
      yaxis: {
        title: isPredict ? 'ceRNA Enrichment Score Variance' : 'Mean Decrease in Accuracy'
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };

    const config = {
      responsive: true
    };

    const el = this.lollipopPlot()?.nativeElement;
    if (el) {
      Plotly.newPlot(el, data, layout, config);
      (el as any).removeAllListeners?.('plotly_click');
      (el as any).on('plotly_click', (clickData: any) => {
        if (clickData?.points?.[0]) {
          const pt = clickData.points[0];
          const info = pt.customdata;
          if (info && info.ensemblID) {
            if (info.ensemblID.startsWith('ENSG')) {
              this.cartService.add({
                ensg_number: info.ensemblID,
                gene_symbol: info.symbol
              });
            } else {
              this.cartService.add({
                enst_number: info.ensemblID,
                gene: { ensg_number: '', gene_symbol: info.symbol || info.ensemblID }
              } as Transcript);
            }
          }
        }
      });
    }
  }

  refreshPlotSizes(): void {
    const lollipopElement = this.lollipopPlot()?.nativeElement;
    if (lollipopElement && lollipopElement.checkVisibility()) {
      Plotly.Plots.resize(lollipopElement);
    }
  }

  clearAll(): void {
    const el = this.lollipopPlot()?.nativeElement;
    if (el) {
      Plotly.purge(el);
    }
    if (this.exploreService) {
      this.exploreService.moduleMembersMap = new Map<string, ModuleMember[]>();
    }
    this.elementLimitWarning.set(false);
  }

  spongEffectsRunParamsString(spongEffectsRunID: number): string {
    const run = this.spongEffectRuns.get(spongEffectsRunID);
    if (!run) {
      return 'No parameters available';
    }

    return `mscor threshold: ${run.m_scor_threshold}
pAdjust threshold: ${run.p_adj_threshold}
modules cutoff: ${run.modules_cutoff}`;
  }

  applyCentersFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.tableCentersResource.value()) {
      this.tableCentersResource.value()!.filter = filterValue.trim().toLowerCase();
      if (this.tableCentersResource.value()!.paginator) {
        this.tableCentersResource.value()!.paginator!.firstPage();
      }
    }
  }

  applyMembersFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.tableMembersResource.value()) {
      this.tableMembersResource.value()!.filter = filterValue.trim().toLowerCase();
      if (this.tableMembersResource.value()!.paginator) {
        this.tableMembersResource.value()!.paginator!.firstPage();
      }
    }
  }

  onPlotRendered() {
  }

  downloadPlot(format: 'png' | 'jpeg' | 'svg'): void {
    const el = this.lollipopPlot()?.nativeElement;
    if (el) {
      Plotly.downloadImage(el, {
        format: format,
        filename: 'lollipop_plot_' + Date.now(),
        width: 800,
        height: 600
      });
    }
  }
}