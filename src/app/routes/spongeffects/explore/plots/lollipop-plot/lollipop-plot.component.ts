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
  ViewChild
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
import { NetworkComponent } from '../../../../browse/network/network.component';
import { ActiveEntitiesComponent } from '../../../../browse/active-entities/active-entities.component';

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
    ActiveEntitiesComponent
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class LollipopPlotComponent {
  private backend = inject(BackendService);
  private versionService = inject(VersionsService);
  private exploreService = inject(ExploreService);
  infoService = inject(InfoService);
  selectedParamSets = computed(() => Object.values(this.exploreService.selectedParamSets$()()));

  refreshSignal$ = input();
  refresh$ = signal(0);

  lollipopPlot = viewChild.required<ElementRef>('lollipopPlot');
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(5, [Validators.min(3), Validators.max(100)]),
    topControl: new FormControl<number>(15, [Validators.min(1), Validators.max(20)]),
    includeModuleMembers: new FormControl<boolean>(false)
  });
  topN = signal(this.formGroup.get('topControl')?.value);
  redNodes = signal(this.formGroup.get('markControl')?.value);
  includeModuleMembers = signal(this.formGroup.get('includeModuleMembers')?.value);
  get includeModuleMembersControl(): FormControl {
  return this.formGroup.get('includeModuleMembers') as FormControl;
}

  defaultMarkerSize = 12;
  MAX_ELEMENTS = undefined;

  selectedVis = 'centers'; // default value for the visualization toggle
  
  columnNames: { [key: string]: string } = {
    symbol: 'Symbol',
    ensemblID: 'Ensembl ID',
    meanGiniDecrease: 'Mean Gini decrease',
    meanAccuracyDecrease: 'Mean accuracy decrease',
    memberOrCenter: 'Center or member',
    moduleCenter: 'Module center',
    moduleParams: 'Module parameters'
  };
  displayedColumns = Object.keys(this.columnNames);

  elementLimitWarning = signal(false);
  moduleMembersMap = new Map<string, ModuleMember[]>();
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
  selectedModules = resource({
    request: () => ({
      redNodes: this.redNodes() ?? 5,
      version: this.versionService.versionReadOnly()(),
      cancer: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      selectedParamSets: this.exploreService.selectedParamSets$()()
    }),
    loader: async ({ request }) => {
      const { redNodes } = request;
      const modules = this.lolipopPlotData.value();
      if (!modules || modules.length === 0) {
        return [];
      }
      return modules.slice(0, redNodes);
    }
  });

  // Data source for reusable heatmap component
  heatmapDataSource = signal<HeatmapDataSource>({
    getData: async (params) => {
      const { version, disease, level, modules, includeMembers } = params;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return [];
      }

      let elements = modules.map((m: { ensemblID: any; }) => m.ensemblID);
      if (includeMembers) {
        for (const module of modules) {
          const key = this.getModuleKey(module);
          if (!this.moduleMembersMap.has(key)) {
            await this.fetchModuleMembers(module);
          }
          const members = this.moduleMembersMap.get(key) || [];
          elements.push(...members.map(m => m.ensemblID));
        }
        elements = [...new Set(elements)];
      }
      
      // Check for element limit
      this.elementLimitWarning.set(false);
      if (this.MAX_ELEMENTS && elements.length > this.MAX_ELEMENTS) {
        elements = elements.slice(0, this.MAX_ELEMENTS);
        this.elementLimitWarning.set(true);
      }
      console.log('disease:', disease);
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
      return 'Expression of selected modules' + (includeMembers ? ' and members' : '');
    },
    
    getYAxisTitle: () => {
      const level = this.exploreService.level$();
      const includeMembers = this.includeModuleMembers();
      return `Module center ${level === 'gene' ? 'gene' : 'transcript'}${includeMembers ? ' and module members' : ''}`;
    },
    
    getZAxisTitle: () => 'Normalized<br>expression',
    
    getZMid: () => 0,
    
    getColorScale: () => 'RdBu'
  });

  // Parameters for the heatmap
  heatmapParams = computed(() => ({
    version: this.versionService.versionReadOnly()(),
    disease: this.exploreService.selectedDisease$(),
    level: this.exploreService.level$(),
    modules: this.selectedModules.value(),
    includeMembers: this.includeModuleMembers()
  }));
  
  // table data
  tableDataResource = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      disease: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      modules: this.selectedModules.value(),
      includeMembers: this.includeModuleMembers()
    }),
    loader: async ({ request }) => {
      const { version, disease, level, modules, includeMembers } = request;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return new MatTableDataSource<SpongEffectsModule | ModuleMember>([]);
      }
      return this.getTableData(modules, includeMembers ?? undefined);
    }
  });

  constructor() {
    this.initializeSpongEffectRuns();
    this.setupEffects();

    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.topN.set(value);
    });
    this.formGroup.get('markControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.redNodes.set(value);
    });
    this.formGroup.get('includeModuleMembers')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.includeModuleMembers.set(value);
    });
  }

  private setupEffects(): void {
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
      const table = this.tableDataResource.value();
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

  private getModuleKey(module: SpongEffectsModule): string {
    return `${module.ensemblID}_${module.spongEffects_run_ID}`;
  }

  private async getLollipopData(version: number, cancer: string, level: string, topN: number, selectedParamSets: {[key: string]: any}): Promise<SpongEffectsModule[]> {
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
          spongEffects_run_ID: entry.spongEffects_run_ID
        })}
      );
      };
    } else {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        let tmp = await this.backend.getSpongEffectsTranscriptModules(version, cancer, paramSet, topN)
        tmp.slice(0, Math.min(topN, data.length)).map(entry => ({
          ensemblID: entry.transcript.enst_number,
          symbol: entry.transcript.gene.gene_symbol,
          meanGiniDecrease: entry.mean_gini_decrease,
          meanAccuracyDecrease: entry.mean_accuracy_decrease,
          spongEffects_run_ID: entry.spongEffects_run_ID
        }));
      };
    }
    return data;
  }

  private async fetchModuleMembers(module: SpongEffectsModule): Promise<void> {
    const version = this.versionService.versionReadOnly()();
    const disease = this.exploreService.selectedDisease$();
    const level = this.exploreService.level$();
    
    if (!version || !disease || !level) return;
    
    let members: ModuleMember[] = [];
    const key = this.getModuleKey(module);
    
    if (level === 'gene') {
      const response = await this.backend.getSpongEffectsGeneModuleMembers(
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
      );
      
      members = response.map(r => ({
        ensemblID: r.gene.ensg_number,
        symbol: r.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID
      }));
    } else {
      const response = await this.backend.getSpongEffectsTranscriptModuleMembers(
        version, disease, module.ensemblID, this.MAX_ELEMENTS
      );
      
      members = response.map(r => ({
        ensemblID: r.transcript.enst_number,
        symbol: r.transcript.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID
      }));
    }
    
    this.moduleMembersMap.set(key, members);
  }

  private async mapSampleToDisease(sample_ID: string, mapping: { [key: string]: string }): Promise<string> {
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

  private async getTableData(
    modules: SpongEffectsModule[],
    includeMembers: boolean | undefined
  ): Promise<MatTableDataSource<SpongEffectsModule | ModuleMember>> {
    let tableEntries: (SpongEffectsModule | ModuleMember)[] = modules.map(module => ({
      ...module,
      memberOrCenter: 'module center',
      moduleCenter: '-',
      moduleParams: this.spongEffectsRunParamsString(module.spongEffects_run_ID)
    }));
    
    if (includeMembers && modules.length > 0) {
      const fetchPromises = modules.map(async module => {
        const key = this.getModuleKey(module);
        if (!this.moduleMembersMap.has(key)) {
          await this.fetchModuleMembers(module);
        }
      });
      
      await Promise.all(fetchPromises);
      
      for (const module of modules) {
        const key = this.getModuleKey(module);
        const members = this.moduleMembersMap.get(key) || [];
        
        tableEntries = [
          ...tableEntries,
          ...members.map(m => ({
            ...m,
            memberOrCenter: 'module member',
            moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID)
          }))
        ];
      }
    }
    
    return new MatTableDataSource(tableEntries);
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
        title: 'Mean Decrease in Gini-Index'
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
    this.moduleMembersMap = new Map<string, ModuleMember[]>();
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.tableDataResource.value()) {
      this.tableDataResource.value()!.filter = filterValue.trim().toLowerCase();
      if (this.tableDataResource.value()!.paginator) {
        this.tableDataResource.value()!.paginator!.firstPage();
      }
    }
  }

  onPlotRendered() {
    console.log('Heatmap plot rendered successfully');
  }
}