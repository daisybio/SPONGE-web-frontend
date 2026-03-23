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
  ModuleMember
} from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { InfoComponent } from '../../../../../components/info/info.component';
import { InfoService } from '../../../../../services/info.service';
import { debounceTime } from 'rxjs';
import { ReusableHeatmapComponent, HeatmapDataSource } from '../../../../../components/heatmap-plot/heatmap-plot.component';
import { NetworkComponent } from '../../../../../components/browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../../../../../components/browse-views/active-entities/active-entities.component';
import { BrowseService } from '../../../../../services/browse.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class LollipopPlotComponent implements AfterViewInit, OnDestroy {
  private backend = inject(BackendService);
  private versionService = inject(VersionsService);
  private exploreService = inject(ExploreService);
  browseService = inject(BrowseService);
  infoService = inject(InfoService);
  selectedParamSets = computed(() => Object.values(this.exploreService.selectedParamSets$()()));

  refreshSignal$ = input();
  refresh$ = signal(0);

  isLoading$ = this.browseService.isLoading$;

  lollipopPlot = viewChild.required<ElementRef>('lollipopPlot');
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private resizeObserver: ResizeObserver | null = null;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(5, [Validators.min(3), Validators.max(100)]),
    topControl: new FormControl<number>(15, [Validators.min(1), Validators.max(20)]),
    includeModuleMembers: new FormControl<boolean>(false)
  });
  // topN = signal(this.formGroup.get('topControl')?.value);
  // redNodes = signal(this.formGroup.get('markControl')?.value);
  // moved this to explore service because also needed for module network 
  // includeModuleMembers = signal(this.formGroup.get('includeModuleMembers')?.value);
  topN = this.exploreService.topN;
  redNodes = this.exploreService.redNodes;
  get includeModuleMembersControl(): FormControl {
    return this.formGroup.get('includeModuleMembers') as FormControl;
  }

  defaultMarkerSize = 12;
  MAX_ELEMENTS = this.exploreService.MAX_ELEMENTS;

  selectedVis = this.exploreService.selectedVis;

  columnNamesCenters: { [key: string]: string } = {
    symbol: 'Symbol',
    ensemblID: 'Ensembl ID',
    meanGiniDecrease: 'Mean Gini Decrease',
    meanAccuracyDecrease: 'Mean Acuracy Decrease',
    moduleParams: 'Module Parameters'
  };
  displayedColumnsCenters = Object.keys(this.columnNamesCenters);

  columnNamesMembers: { [key: string]: string } = {
    symbol: 'Symbol',
    ensemblID: 'Ensembl ID',
    moduleCenter: 'Module Center',
  };
  displayedColumnsMembers = Object.keys(this.columnNamesMembers);

  elementLimitWarning = signal(false);
  spongEffectRuns = new Map<number, SpongEffectsRun>();

  gProfilerUrl$ = computed(() => {
    const modules = this.selectedModules.value()
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
      cancer: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      topN: this.topN() ?? 15,
      selectedParamSets: this.exploreService.selectedParamSets$()()
    }),
    loader: ({ request }) => {
      const { version, cancer, level, topN, selectedParamSets } = request;
      if (!version || !cancer || !level || !selectedParamSets) {
        return Promise.resolve([]);
      }
      const greyModules = this.getLollipopData(version, cancer, level, topN, selectedParamSets);
      return greyModules;
    }
  });

  // the red modules
  get selectedModules() {
    return this.exploreService.selectedModules;
  }

  // Data source for reusable heatmap component
  heatmapDataSourceEnrich = signal<HeatmapDataSource>({
    getData: async (params) => {
      const { version, disease, level, modules } = params;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return [];
      }
      console.log('modules for heatmap:', modules);
      // let elements = modules.map((m: { ensemblID: any; }) => m.ensemblID);
      let elements: string[] = modules.map((m: { spongEffects_module_ID: any; }) => m.spongEffects_module_ID);

      // this works just for expression heatmaps (enrichment scores only for module centers)
      // if (includeMembers) {
      //   for (const module of modules) {
      //     const key = this.exploreService.getModuleKey(module);
      //     if (!this.exploreService.moduleMembersMap.has(key)) {
      //       await this.exploreService.fetchModuleMembers(module);
      //     }
      //     const members = this.exploreService.moduleMembersMap.get(key) || [];
      //     elements.push(...members.map(m => m.ensemblID));
      //   }
      //   elements = [...new Set(elements)];
      // }

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
      const level = this.exploreService.level$();
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
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return [];
      }
      console.log('modules for heatmap:', modules);
      let elements = modules.map((m: { ensemblID: any; }) => m.ensemblID);
      // let elements: string[] = modules.map((m: { spongEffects_module_ID: any; }) => m.spongEffects_module_ID);

      // forced to centers-only by user request
      /*
      if (includeMembers) {
        for (const module of modules) {
          const key = this.exploreService.getModuleKey(module);
          if (!this.exploreService.moduleMembersMap.has(key)) {
            await this.exploreService.fetchModuleMembers(module);
          }
          const members = this.exploreService.moduleMembersMap.get(key) || [];
          elements.push(...members.map(m => m.ensemblID));
        }
        elements = [...new Set(elements)];
      }
      */

      // Check for element limit
      this.elementLimitWarning.set(false);
      if (this.MAX_ELEMENTS && elements.length > this.MAX_ELEMENTS) {
        elements = elements.slice(0, this.MAX_ELEMENTS);
        this.elementLimitWarning.set(true);
      }
      const dataset_ID: number = this.exploreService.selectedDiseaseObject$().dataset_ID;
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
      const level = this.exploreService.level$();
      const includeMembers = this.exploreService.includeModuleMembers();
      return `Module Center ${level === 'gene' ? 'Gene' : 'Transcript'}${includeMembers ? ' and Module Members' : ''}`;
    },

    getZAxisTitle: () => `${this.exploreService.level$() === 'gene' ? 'Gene' : 'Transcript'}<br>Expression`,

    getZMid: () => 0,

    getColorScale: () => 'RdBu'
  });

  // Parameters for the heatmaps
  heatmapParamsEnrich = computed(() => ({
    version: this.versionService.versionReadOnly()(),
    disease: this.exploreService.selectedDisease$(),
    level: this.exploreService.level$(),
    modules: this.selectedModules.value(),
    includeMembers: false,
    value_key: 'score_value'
  }));
  heatmapParamsExpr = computed(() => ({
    version: this.versionService.versionReadOnly()(),
    disease: this.exploreService.selectedDisease$(),
    level: this.exploreService.level$(),
    modules: this.selectedModules.value(),
    includeMembers: this.exploreService.includeModuleMembers(),
    // value_key: keep it undefined -> default
  }));

  // table data
  tableCentersResource = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      disease: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      modules: this.selectedModules.value(),
    }),
    loader: async ({ request }) => {
      console.log('Loading table data with request:', request);
      const { version, disease, level, modules } = request;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return new MatTableDataSource<SpongEffectsModule>([]);
      }
      const data = this.getCentersForTable(modules);
      return data;
    }
  });

  tableMembersResource = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      disease: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      modules: this.selectedModules.value(),
    }),
    loader: async ({ request }) => {
      console.log('Loading table data with request:', request);
      const { version, disease, level, modules } = request;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return new MatTableDataSource<ModuleMember>([]);
      }
      const data = this.getMembersForTable(modules);
      console.log('Table data loaded:', data);
      return data;
    }
  });

  constructor() {
    this.initializeSpongEffectRuns();
    this.setupEffects();

    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.topN.set(value ? value : undefined);
    });
    this.formGroup.get('markControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.redNodes.set(value ? value : undefined);
    });
    this.formGroup.get('includeModuleMembers')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.exploreService.includeModuleMembers.set(value);
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
    // Keep the form control in sync if the signal changes elsewhere
    effect(() => {
      const value = this.exploreService.includeModuleMembers();
      if (this.formGroup.get('includeModuleMembers')?.value !== value) {
        this.formGroup.get('includeModuleMembers')?.setValue(value, { emitEvent: false });
      }
      const topN = this.exploreService.topN();
      if (this.formGroup.get('topControl')?.value !== topN) {
        this.formGroup.get('topControl')?.setValue(topN ?? null, { emitEvent: false });
      }
      const redNodes = this.exploreService.redNodes();
      if (this.formGroup.get('markControl')?.value !== redNodes) {
        this.formGroup.get('markControl')?.setValue(redNodes ?? null, { emitEvent: false });
      }
    });

    effect(() => {
      this.refreshSignal$();
      this.refreshPlotSizes();
    });

    effect(() => {
      this.exploreService.selectedDisease$();
      this.exploreService.level$();
      this.clearAll();
    });

    effect(() => {
      const redNodes = this.redNodes();
      const greyModules = this.lolipopPlotData.value();
      if (greyModules && greyModules.length > 0 && redNodes) {
        this.renderLollipopPlot(greyModules, redNodes);
      }
    });

    effect(() => {
      const table = this.tableCentersResource.value();
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
      if ((this.selectedModules.value()?.length ?? 0) === 0 && this.lolipopPlotData && (this.lolipopPlotData.value()?.length ?? 0) > 0) {
        this.selectedModules.reload();
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
    const fetchPromises = modules.map(async module => {
      const key = this.exploreService.getModuleKey(module);
      if (!this.exploreService.moduleMembersMap.has(key)) {
        await this.exploreService.fetchModuleMembers(module);
      }
    });

    await Promise.all(fetchPromises);

    const allMembers: ModuleMember[] = [];
    for (const module of modules) {
      const key = this.exploreService.getModuleKey(module);
      const members = this.exploreService.moduleMembersMap.get(key) || [];

      allMembers.push(...members.map(m => ({
        ...m,
        moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID)
      })));
    }
    return new MatTableDataSource(allMembers);
  }

  private renderLollipopPlot(limitedData: SpongEffectsModule[], redNodes: number): void {
    const data = [{
      x: limitedData.map(g => g.meanGiniDecrease),
      y: limitedData.map(g => g.meanAccuracyDecrease),
      mode: 'markers',
      type: 'scatter',
      name: 'Modules',
      text: limitedData.map(g => g.symbol),
      marker: {
        size: this.defaultMarkerSize,
        color: limitedData.map((_, i) => i < redNodes ? 'red' : 'grey')
      }
    }];

    const layout = {
      title: 'Module Importance',
      showlegend: false,
      autosize: true,
      hovermode: 'closest',
      margin: {
        t: 30,
      },
      xaxis: {
        title: 'Mean Decrease in Gini Index'
      },
      yaxis: {
        title: 'Mean Decrease in Accuracy'
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };

    const config = {
      responsive: true
    };

    Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  }

  refreshPlotSizes(): void {
    const lollipopElement = this.lollipopPlot().nativeElement;

    if (lollipopElement.checkVisibility()) {
      Plotly.Plots.resize(lollipopElement);
    }
  }

  clearAll(): void {
    Plotly.purge(this.lollipopPlot().nativeElement);
    this.exploreService.moduleMembersMap = new Map<string, ModuleMember[]>();
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