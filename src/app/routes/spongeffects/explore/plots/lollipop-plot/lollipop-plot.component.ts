import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  resource,
  signal,
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
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { PredictService } from '../../../predict/service/predict.service';
import { InfoComponent } from '../../../../../components/info/info.component';
import { InfoService } from '../../../../../services/info.service';
import { debounceTime } from 'rxjs';
import { ReusableHeatmapComponent, HeatmapDataSource } from '../../../../../components/heatmap-plot/heatmap-plot.component';
import { NetworkComponent } from '../../../../../components/browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../../../../../components/browse-views/active-entities/active-entities.component';
import { BrowseService } from '../../../../../services/browse.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ModalsService } from '../../../../../components/modals-service/modals.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddToCartButtonComponent } from '../../../../../components/add-to-cart-button/add-to-cart-button.component';

declare var Plotly: any;

@Component({
  selector: 'app-lollipop-plot',
  imports: [
    MatExpansionModule,
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
    MatButtonToggleModule,
    NetworkComponent,
    ActiveEntitiesComponent,
    MatProgressSpinnerModule,
    MatTooltipModule,
    AddToCartButtonComponent
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class LollipopPlotComponent implements OnInit, AfterViewInit, OnDestroy {
  private backend = inject(BackendService);
  private versionService = inject(VersionsService);
  exploreService = inject(ExploreService, { optional: true });
  predictService = inject(PredictService, { optional: true });
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

  selectedParamSets = computed(() => {
    if (this.source() === 'predict') return [];
    return Object.values(this.exploreService?.selectedParamSets$() || {});
  });

  refreshSignal$ = input();
  refresh$ = signal(0);

  isLoading$ = this.browseService.isLoading$;

  lollipopPlot = viewChild<ElementRef>('lollipopPlot');
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private resizeObserver: ResizeObserver | null = null;

  formGroup = new FormGroup({
    topControl: new FormControl<number>(15, [Validators.min(3), Validators.max(100)]),
    markControl: new FormControl<number>(5, [Validators.min(1), Validators.max(100)]),
    includeModuleMembers: new FormControl<boolean>(false),
    sortBy: new FormControl<string>(''),
    filterMinScore1: new FormControl<number | null>(null),
    filterMinScore2: new FormControl<number | null>(null)
  });

  topN = signal<number | undefined>(15);
  redNodes = signal<number | undefined>(5);
  includeModuleMembers = signal<boolean | null>(false);

  get includeModuleMembersControl(): FormControl {
    return this.formGroup.get('includeModuleMembers') as FormControl;
  }

  sortBy$ = signal<string>('');
  minScore1$ = signal<number | null>(null);
  minScore2$ = signal<number | null>(null);

  defaultMarkerSize = 12;
  MAX_ELEMENTS = 100;

  selectedVis = signal<string>('plot');

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

  predictModuleMembersMap = new Map<string, ModuleMember[]>();

  async fetchPredictModuleMembers(module: SpongEffectsModule): Promise<void> {
    const version = this.versionService.versionReadOnly()();
    const disease = this.prediction()?.meta[0]?.type_predict || this.predictService?.selectedDataset$()?.disease_name;
    const level = this.predictService?.level() || 'gene';
    if (!version || !disease || !level) return;

    const key = `${module.ensemblID}_predict`;
    if (this.predictModuleMembersMap.has(key)) return;

    let members: ModuleMember[] = [];
    if (level === 'gene') {
      const response = await this.backend.getSpongEffectsGeneModuleMembers(
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
      );
      members = response.map(r => ({
        ensemblID: r.gene.ensg_number,
        symbol: r.gene.gene_symbol,
        moduleCenter: module.symbol,
        spongEffects_run_ID: 0
      }));
    } else {
      const response = await this.backend.getSpongEffectsTranscriptModuleMembers(
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
      );
      members = response.map(r => ({
        ensemblID: r.transcript.enst_number,
        symbol: r.transcript.gene.gene_symbol,
        moduleCenter: module.symbol,
        spongEffects_run_ID: 0
      }));
    }
    this.predictModuleMembersMap.set(key, members);
  }

  // Caching and symbol resolution for predict mode
  predictionModulesResource = resource({
    request: () => ({
      pred: this.prediction(),
      version: this.versionService.versionReadOnly()(),
      source: this.source()
    }),
    loader: async ({ request }) => {
      const { pred, version, source } = request;
      if (source !== 'predict' || !pred || !pred.scores || !pred.scores.genes || !pred.scores.values || !version) return [];

      const genes = pred.scores.genes;
      const values = pred.scores.values;
      const modules: SpongEffectsModule[] = [];

      // Resolve all gene symbols in parallel
      const symbolMap = new Map<string, string>();
      await Promise.all(genes.map(async (geneId: string) => {
        try {
          const response = await this.backend.getGeneInfo(version, geneId);
          if (response.length === 1) {
            symbolMap.set(geneId, response[0].gene_symbol);
          }
        } catch (e) {
          console.error(e);
        }
      }));

      for (let i = 0; i < genes.length; i++) {
        const geneId = genes[i];
        const scoresForGene = values[i] || [];

        const count = scoresForGene.length;
        const sum = scoresForGene.reduce((s: number, v: number) => s + v, 0);
        const mean = count > 0 ? sum / count : 0;
        const variance = count > 0
          ? scoresForGene.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / count
          : 0;

        modules.push({
          ensemblID: geneId,
          symbol: symbolMap.get(geneId) ?? geneId,
          meanGiniDecrease: 0,
          meanAccuracyDecrease: 0,
          meanEnrichmentScore: mean,
          absMeanEnrichmentScore: Math.abs(mean),
          varianceEnrichmentScore: variance,
          spongEffects_run_ID: 0,
          spongEffects_module_ID: 0
        });
      }
      return modules;
    }
  });

  allModules$ = computed(() => {
    if (this.source() === 'predict') {
      return this.predictionModulesResource.value() || [];
    } else {
      return this.lolipopPlotData.value() || [];
    }
  });


  filteredAndSortedModules$ = computed(() => {
    let list = [...this.allModules$()];
    const sortBy = this.sortBy$();
    const min1 = this.minScore1$();
    const min2 = this.minScore2$();

    // Apply filtering
    if (this.source() === 'explore') {
      if (min1 !== null && min1 !== undefined && !isNaN(min1)) {
        list = list.filter(m => m.meanAccuracyDecrease >= min1);
      }
      if (min2 !== null && min2 !== undefined && !isNaN(min2)) {
        list = list.filter(m => m.meanGiniDecrease >= min2);
      }
    } else {
      if (min1 !== null && min1 !== undefined && !isNaN(min1)) {
        list = list.filter(m => (m.absMeanEnrichmentScore ?? 0) >= min1);
      }
      if (min2 !== null && min2 !== undefined && !isNaN(min2)) {
        list = list.filter(m => (m.varianceEnrichmentScore ?? 0) >= min2);
      }
    }

    // Apply sorting
    if (sortBy) {
      list.sort((a: any, b: any) => {
        const valA = a[sortBy] ?? 0;
        const valB = b[sortBy] ?? 0;
        return valB - valA; // Descending
      });
    }

    return list;
  });

  selectedModules$ = computed(() => {
    if (this.source() === 'predict') {
      const redNodes = this.redNodes() || 5;
      return this.filteredAndSortedModules$().slice(0, redNodes);
    } else {
      return this.exploreService?.selectedModules.value() || [];
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
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.exploreService?.selectedDisease$(),
      level: this.exploreService?.level$(),
      topN: this.topN() ?? 15,
      selectedParamSets: this.exploreService?.selectedParamSets$(),
      source: this.source()
    }),
    loader: ({ request }) => {
      const { version, cancer, level, topN, selectedParamSets, source } = request;
      if (source === 'predict') return Promise.resolve([]);
      if (!version || !cancer || !level || !selectedParamSets) {
        return Promise.resolve([]);
      }
      const greyModules = this.getLollipopData(version, cancer, level, topN, selectedParamSets);
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
        if (!pred || !pred.scores || !pred.scores.genes || !pred.scores.values) return [];

        const res: any[] = [];
        const finalGenes = modules.map((m: SpongEffectsModule) => m.ensemblID);
        const finalGenesSymbols = new Map(modules.map((m: SpongEffectsModule) => [m.ensemblID, m.symbol]));
        const samples = pred.scores.samples;

        for (const ensemblID of finalGenes) {
          const geneIdx = pred.scores.genes.indexOf(ensemblID);
          if (geneIdx === -1) continue;

          const geneSymbol = finalGenesSymbols.get(ensemblID) || ensemblID;
          const scoresForGene = pred.scores.values[geneIdx] || [];

          for (let sampleIdx = 0; sampleIdx < samples.length; sampleIdx++) {
            const sample = samples[sampleIdx];
            const val = scoresForGene[sampleIdx] ?? 0;

            const samplePred = pred.data.find((d: any) => d.sampleID === sample);
            const subtype = samplePred ? samplePred.typePrediction : 'Unknown';

            res.push({
              id: geneSymbol,
              sample_ID: sample,
              score_value: val,
              disease_subtype: subtype
            });
          }
        }
        return res;
      }

      console.log('modules for heatmap:', modules);
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

    getZAxisTitle: () => 'SpongEffects Module<br>Enrichment Score',

    getZMid: () => 0,

    getColorScale: () => ''
  });

  // Data source for reusable heatmap component
  heatmapDataSourceExpr = signal<HeatmapDataSource>({
    getData: async (params) => {
      const { version, disease, level, modules, includeMembers } = params;
      if (!version || !disease || !level || !modules || modules.length === 0 || this.source() === 'predict') {
        return [];
      }
      console.log('modules for heatmap:', modules);
      let elements = modules.map((m: { ensemblID: any; }) => m.ensemblID);

      // Check for element limit
      this.elementLimitWarning.set(false);
      if (this.MAX_ELEMENTS && elements.length > this.MAX_ELEMENTS) {
        elements = elements.slice(0, this.MAX_ELEMENTS);
        this.elementLimitWarning.set(true);
      }
      const dataset_ID: number = this.exploreService!.selectedDiseaseObject$().dataset_ID;
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
    },

    getTitle: (params) => {
      const { includeMembers } = params;
      return 'Expression of Selected Modules' + (includeMembers ? ' and Members' : '');
    },

    getYAxisTitle: () => {
      const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
      const includeMembers = this.source() === 'predict'
        ? (this.formGroup.get('includeModuleMembers')?.value ?? false)
        : (this.exploreService?.includeModuleMembers() ?? false);
      return `Module Center ${level === 'gene' ? 'Gene' : 'Transcript'}${includeMembers ? ' and Module Members' : ''}`;
    },

    getZAxisTitle: () => {
      const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
      return `${level === 'gene' ? 'Gene' : 'Transcript'}<br>Expression`;
    },

    getZMid: () => 0,

    getColorScale: () => 'RdBu'
  });

  // Parameters for the heatmaps
  heatmapParamsEnrich = computed(() => {
    const version = this.versionService.versionReadOnly()();
    const disease = this.source() === 'predict'
      ? (this.prediction()?.meta[0]?.type_predict || this.predictService?.selectedDataset$()?.disease_name)
      : this.exploreService?.selectedDisease$();
    const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
    return {
      version,
      disease,
      level,
      modules: this.selectedModules$(),
      includeMembers: false,
      value_key: 'score_value'
    };
  });

  heatmapParamsExpr = computed(() => {
    const version = this.versionService.versionReadOnly()();
    const disease = this.source() === 'predict'
      ? (this.prediction()?.meta[0]?.type_predict || this.predictService?.selectedDataset$()?.disease_name)
      : this.exploreService?.selectedDisease$();
    const level = this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$();
    return {
      version,
      disease,
      level,
      modules: this.selectedModules$(),
      includeMembers: this.source() === 'predict' ? this.formGroup.get('includeModuleMembers')?.value ?? false : this.exploreService?.includeModuleMembers(),
    };
  });

  tableCenters$ = computed(() => {
    const modules = this.source() === 'predict'
      ? this.filteredAndSortedModules$()
      : (this.exploreService?.selectedModules.value() || []);

    const tableEntries = modules.map(module => ({
      ...module,
      moduleParams: this.source() === 'predict'
        ? 'Custom Prediction'
        : this.spongEffectsRunParamsString(module.spongEffects_run_ID)
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
    request: () => ({
      modules: this.selectedModules$(),
      source: this.source(),
      version: this.versionService.versionReadOnly()(),
      disease: this.source() === 'predict'
        ? (this.prediction()?.meta[0]?.type_predict || this.predictService?.selectedDataset$()?.disease_name)
        : this.exploreService?.selectedDisease$(),
      level: this.source() === 'predict' ? this.predictService?.level() : this.exploreService?.level$(),
    }),
    loader: async ({ request }) => {
      const { modules, source, version, disease, level } = request;
      if (modules.length === 0 || !version || !disease || !level) {
        return new MatTableDataSource<ModuleMember>([]);
      }

      if (source === 'predict') {
        const fetchPromises = modules.map(async module => {
          const key = `${module.ensemblID}_predict`;
          if (!this.predictModuleMembersMap.has(key)) {
            await this.fetchPredictModuleMembers(module);
          }
        });
        await Promise.all(fetchPromises);

        const allMembers: ModuleMember[] = [];
        for (const module of modules) {
          const key = `${module.ensemblID}_predict`;
          const members = this.predictModuleMembersMap.get(key) || [];
          allMembers.push(...members.map(m => ({
            ...m,
            moduleCenterID: module.ensemblID,
            moduleParams: 'Custom Prediction'
          })));
        }
        return new MatTableDataSource(allMembers);
      } else {
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
    if (this.source() === 'predict') {
      this.formGroup.get('sortBy')?.setValue('absMeanEnrichmentScore', { emitEvent: false });
      this.sortBy$.set('absMeanEnrichmentScore');
    } else {
      this.formGroup.get('sortBy')?.setValue('meanAccuracyDecrease', { emitEvent: false });
      this.sortBy$.set('meanAccuracyDecrease');
    }
  }

  constructor() {
    if (this.exploreService) {
      this.topN = this.exploreService.topN;
      this.redNodes = this.exploreService.redNodes;
      this.includeModuleMembers = this.exploreService.includeModuleMembers;
      this.selectedVis = this.exploreService.selectedVis;
      this.MAX_ELEMENTS = this.exploreService.MAX_ELEMENTS;
      this.sortBy$ = this.exploreService.sortBy;
      this.minScore1$ = this.exploreService.minScore1;
      this.minScore2$ = this.exploreService.minScore2;
    }

    this.initializeSpongEffectRuns();
    this.setupEffects();

    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.topN.set(value ? value : undefined);
    });
    this.formGroup.get('markControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.redNodes.set(value ? value : undefined);
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
      const redNodes = this.redNodes();
      if (this.formGroup.get('markControl')?.value !== redNodes) {
        this.formGroup.get('markControl')?.setValue(redNodes ?? null, { emitEvent: false });
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
      this.clearAll();
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
      if (this.source() === 'predict') {
        const parentNetworkData = this.predictService?.moduleNetworkData$.value();
        if (parentNetworkData) {
          this.browseService.setManualData(parentNetworkData);
        }
      }
    });

    effect(() => {
      const redNodes = this.redNodes();
      const modules = this.filteredAndSortedModules$();
      const vis = this.selectedVis();
      if (vis === 'plot' && modules && modules.length > 0 && redNodes) {
        setTimeout(() => {
          this.renderLollipopPlot(modules, redNodes);
        });
      }
    });

    effect(() => {
      const table = this.tableCenters$();
      if (table && this.paginator && this.sort) {
        table.paginator = this.paginator;
        table.sort = this.sort;
      }
    });

    effect(() => {
      const table = this.tableMembersResource.value();
      if (table && this.paginator && this.sort) {
        table.paginator = this.paginator;
        table.sort = this.sort;
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

  private async getLollipopData(version: number, cancer: string, level: string, topN: number, selectedParamSets: { [key: string]: any }): Promise<SpongEffectsModule[]> {
    const data: SpongEffectsModule[] = [];
    if (level === 'gene') {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        let tmp = await this.backend.getSpongEffectsGeneModules(version, cancer, paramSet, topN)
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
        let tmp = await this.backend.getSpongEffectsTranscriptModules(version, cancer, paramSet, topN);
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

  private renderLollipopPlot(limitedData: SpongEffectsModule[], redNodes: number): void {
    const isPredict = this.source() === 'predict';
    const greyData = limitedData.slice(redNodes);
    const redData = limitedData.slice(0, redNodes);

    const data = [
      {
        x: isPredict ? greyData.map(g => g.meanEnrichmentScore ?? 0) : greyData.map(g => g.meanGiniDecrease),
        y: isPredict ? greyData.map(g => g.varianceEnrichmentScore ?? 0) : greyData.map(g => g.meanAccuracyDecrease),
        mode: 'markers',
        type: 'scatter',
        name: 'Other Modules',
        text: greyData.map(g => g.symbol),
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
        text: redData.map(g => g.symbol),
        marker: {
          size: this.defaultMarkerSize,
          color: 'red',
          opacity: 1
        }
      }
    ];

    const layout = {
      title: isPredict ? 'Module Enrichment & Variance' : 'Module Importance',
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
    console.log('Heatmap plot rendered successfully');
  }
}