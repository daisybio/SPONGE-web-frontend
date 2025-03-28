import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  resource,
  ResourceRef,
  Signal,
  signal,
  viewChild,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
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
import {
  Dataset,
  GeneExpression,
  ModuleMember,
  PlotlyData,
  SpongEffectsModule,
  SpongEffectsRun,
  TranscriptExpression,
} from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { InfoComponent } from '../../../../../components/info/info.component';
import { InfoService } from '../../../../../services/info.service';

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
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class LollipopPlotComponent implements AfterViewInit {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  infoService = inject(InfoService)
  backend = inject(BackendService);
  refreshSignal$ = input();
  elementLimitWarning: boolean = false;
  columnNames: { [key: string]: string } = {
    ensemblID: 'Ensembl ID',
    symbol: 'Symbol',
    meanGiniDecrease: 'Mean Gini decrease',
    meanAccuracyDecrease: 'Mean accuracy decrease',
    memberOrCenter: 'Center or member',
    moduleCenter: 'Module center',
    // spongEffects_run_ID: 'SpongEffects run ID',
    moduleParams: 'Module parameters',
  };
  displayedColumns: string[] = Object.keys(this.columnNames);
  elementExpressionLoading: boolean = true;
  selectedModules = signal<SpongEffectsModule[]>([]);
  moduleMembersMap = signal(new Map<string, ModuleMember[]>());
  tableData = signal(new MatTableDataSource<SpongEffectsModule | ModuleMember>([]));
  spongEffectRuns: Map<number, SpongEffectsRun> = new Map<number, SpongEffectsRun>();

  // plot parameters
  defaultMarkerSize: number = 12;
  // moduleExpressionData: PlotlyData = {data: [], layout: {}, config: {}};

  lollipopPlot = viewChild.required<ElementRef<HTMLDivElement>>('lollipopPlot');
  moduleExpressionHeatmap = viewChild.required<ElementRef<HTMLDivElement>>('moduleExpressionHeatmap');
  // @ViewChild('lollipopPlot', { static: false }) lollipopPlot!: ElementRef<HTMLDivElement>;
  // @ViewChild('moduleExpressionHeatmap', { static: false }) moduleExpressionHeatmap!: ElementRef<HTMLDivElement>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(5, [
      Validators.min(3.0),
      Validators.max(100),
    ]),
    topControl: new FormControl<number>(15, [
      Validators.min(1.0),
      Validators.max(20),
    ]),
    includeModuleMembers: new FormControl<boolean>(false),
  });


  // tableData = resource({
  //   request: () => ({
  //     modules: this.selectedModules(),
  //     members: this.moduleMembersMap(),
  //   }),
  //   loader: async (param) => {
  //     const modules = param.request.modules;
  //     const members = param.request.members;
  //     const data: SpongEffectsModule[] | ModuleMember[] = [...modules];
  //     members.forEach((memberList, moduleId) => {
  //       memberList.forEach((member) => {
  //         data.push({ ...member, memberOrCenter: 'module member'} as ModuleMember);
  //       });
  //     });
  //     const table = new MatTableDataSource(data);
  //     table.paginator = this.paginator;
  //     table.sort = this.sort;
  //     return table;
  //   },
  // });

  lolipopPlotData = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
    }),
    loader: async (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      if (!version || !cancer || !level) {
        return [];
      }
      return this.getLollipopData(version, cancer, level);
    },
  });

  moduleExpressionData = resource({
    request: () => ({
      modules: this.selectedModules(),
    }),
    loader: async (param) => {
      const version = this.versionService.versionReadOnly()();
      const disease = this.exploreService.selectedDiseaseObject$();
      const level = this.exploreService.level$();
      const selectedModules = param.request.modules;

      if (!version || !disease || !level || !selectedModules) {
        return { data: [], layout: {}, config: {} };
      }
      return this.getModulesExpression(version, level, disease, selectedModules);
    },
  });

  constructor() {
    // get all spong effects runs once
    const version = this.versionService.versionReadOnly()();
    if (version) {
      this.getSpongEffectRuns(version);
    }
    console.log('SpongEffectRuns', this.spongEffectRuns);

    effect(() => {
      this.exploreService.selectedDisease$();
      this.exploreService.level$();
      this.clearPlot();
    });

    effect(() => {
      if (this.lolipopPlotData.isLoading()) {
        Plotly.purge(this.lollipopPlot().nativeElement);
      }
    });

    effect(() => {
      if (this.moduleExpressionData.isLoading()) {
        Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
      }
    });

    effect(() => {
      const includeMembers = this.formGroup.get('includeModuleMembers')?.value;
      if (includeMembers !== undefined) {
        this.updateTableData();
      }
    });

    effect(async () => {
      const lolipopData = this.lolipopPlotData.value();
      if (lolipopData) {
        this.plotLollipopPlot(lolipopData);
      }
    });

    effect(() => {
      const modules = this.moduleExpressionData.value();
      if (modules) {
        this.plotModuleExpression(modules);
      }
    });

    effect(() => {
      if (this.tableData() ) {
        this.tableData().paginator = this.paginator;
        this.tableData().sort = this.sort;
      }
    });

    this.formGroup.valueChanges.subscribe(() => {
      const lolipopData = this.lolipopPlotData.value();
      if (lolipopData) {
        this.plotLollipopPlot(lolipopData);
      }

      if (this.selectedModules().length > 0) {
        const modules = this.moduleExpressionData.value();
        if (modules) {
          this.plotModuleExpression(modules);
        }
      }
    });

    // setTimeout(() => {
    //   if (this.lollipopPlot()) {
    //     this.lollipopPlot().nativeElement.addEventListener('plotly_click', (event: any) => {
    //       if (event.points && event.points.length > 0) {
    //         const pointIndex = event.points[0].pointIndex;
    //         const lolipopData = this.lolipopPlotData.value()!;
    //         const clickedModule = lolipopData[pointIndex];
    //         // this.toggleModule(clickedModule);
    //       }
    //     });
    //   }
    // });
  }

  ngAfterViewInit(): void {
    this.refreshPlot();
  }

  async getLollipopData(version: number, cancer: string, level: string): Promise<SpongEffectsModule[]> {
    if (level === 'gene') {
      const query = await this.backend.getSpongEffectsGeneModules(version, cancer);
      return query.map((entry) => ({
        ensemblID: entry.gene.ensg_number,
        symbol: entry.gene.gene_symbol,
        meanGiniDecrease: entry.mean_gini_decrease,
        meanAccuracyDecrease: entry.mean_accuracy_decrease,
        spongEffects_run_ID: entry.spongEffects_run_ID,
      }));
    } else {
      const query = await this.backend.getSpongEffectsTranscriptModules(version, cancer);
      return query.map((entry) => ({
        ensemblID: entry.transcript.enst_number,
        symbol: entry.transcript.enst_number,
        meanGiniDecrease: entry.mean_gini_decrease,
        meanAccuracyDecrease: entry.mean_accuracy_decrease,
        spongEffects_run_ID: entry.spongEffects_run_ID,
      }));
    }
  }

  async plotLollipopPlot(plot_data: SpongEffectsModule[] | undefined) {
    if (this.lolipopPlotData.isLoading()) {
      Plotly.purge(this.lollipopPlot().nativeElement);
      return;
    }

    if (!plot_data) {
      return;
    }

    let giniData: SpongEffectsModule[] = [...plot_data];

    const redNodes: number = this.formGroup.value.markControl ?? 0;
    const n: number = this.formGroup.value.topControl ?? 0;
    let idx: number = n > giniData.length ? giniData.length : n;
    giniData = giniData.slice(0, idx);
    this.addModules(giniData.slice(0, redNodes));

    let data: any[] = [
      {
        x: giniData.map((g) => g.meanGiniDecrease),
        y: giniData.map((g) => g.meanAccuracyDecrease),
        mode: 'markers',
        type: 'scatter',
        name: giniData.map((g) => g.symbol),
        text: giniData.map((g) => g.symbol),
        marker: {
          size: this.defaultMarkerSize,
          color: giniData.map((g) =>
            this.selectedModules().some(m => m.ensemblID === g.ensemblID) ? 'red' : 'grey',
          ),
        },
      },
    ];

    const layout = {
      title: 'Module importance',
      showlegend: false,
      autosize: true,
      hovermode: 'closest',
      xaxis: {
        title: 'Mean decrease in Gini-index',
      },
      yaxis: {
        title: 'Mean decrease in accuracy',
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    };
    const config = {
      responsive: true,
    };

    Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  }

  // async toggleModule(module: SpongEffectsModule) {
  //   const selectedModules = this.selectedModules();
  //   const moduleIndex = selectedModules.findIndex(
  //     (m) => m.ensemblID === module.ensemblID,
  //   );

  //   if (moduleIndex === -1) {
  //     this.selectedModules.set([...selectedModules, module]);
  //   } else {
  //     this.selectedModules.set(
  //       selectedModules.filter((m) => m.ensemblID !== module.ensemblID),
  //     );
  //   }

  //   await this.updateTableData();

  //   if (this.plot_data.length > 0) {
  //     this.plotLollipopPlot(this.plot_data);
  //   }
  // }

  refreshPlot() {
    const plotDiv = this.lollipopPlot().nativeElement;
    const plotDiv2 = this.moduleExpressionHeatmap().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
    if (plotDiv2.checkVisibility()) {
      Plotly.Plots.resize(plotDiv2);
    }
  }

  clearPlot() {
    Plotly.purge(this.lollipopPlot().nativeElement);
    Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
    this.selectedModules.set([]);
    this.moduleMembersMap.set(new Map<string, ModuleMember[]>());
    this.elementLimitWarning = false;
  }

  addModules(modules: SpongEffectsModule[], clickedSymbol?: string) {
    if (!clickedSymbol) {
      this.selectedModules.set(modules);
    } else {
      const currentModules = this.selectedModules();
      const hasSymbol = currentModules.some(m => m.symbol === clickedSymbol);

      if (hasSymbol) {
        this.selectedModules.set(currentModules.filter(m => m.symbol !== clickedSymbol));
      } else {
        const modulesToAdd = modules.filter(m => m.symbol === clickedSymbol);
        this.selectedModules.set([...currentModules, ...modulesToAdd]);
      }
    }

    this.updateTableData();
  }

  async updateTableData() {
    const includeMembers = this.formGroup.get('includeModuleMembers')?.value || false;
    let tableEntries: (SpongEffectsModule | ModuleMember)[] = [...this.selectedModules()].map(module => ({
      ...module,
      memberOrCenter: 'module center',
      moduleCenter: '-',
      moduleParams: this.spongEffectsRunParamsString(module.spongEffects_run_ID),
    }));

    if (includeMembers) {
      for (const module of this.selectedModules()) {
        if (!this.moduleMembersMap().has(module.ensemblID)) {
          await this.fetchModuleMembers(module);
        }

        const members = this.moduleMembersMap().get(module.ensemblID) || [];
        tableEntries = [...tableEntries, ...members.map(m => ({
          ...m,
          memberOrCenter: 'module member',
          moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID),
        }))];
      }
    }

    this.tableData.set(new MatTableDataSource(tableEntries));
  }

  async fetchModuleMembers(module: SpongEffectsModule) {
    const version = this.versionService.versionReadOnly()();
    const disease = this.exploreService.selectedDisease$();
    const level = this.exploreService.level$();

    if (!version || !disease || !level) return;

    let members: ModuleMember[] = [];

    if (level === 'gene') {
      const response = await this.backend.getSpongEffectsGeneModuleMembers(
        version,
        disease,
        module.ensemblID
      );

      members = response.map(r => ({
        ensemblID: r.gene.ensg_number,
        symbol: r.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID,
      }));
    } else {
      const response = await this.backend.getSpongEffectsTranscriptModuleMembers(
        version,
        disease,
        module.ensemblID
      );

      members = response.map(r => ({
        ensemblID: r.transcript.enst_number,
        symbol: r.transcript.enst_number,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID,
      }));
    }

    this.moduleMembersMap.set(new Map(this.moduleMembersMap().set(module.ensemblID, members)));
  }

  async getModulesExpression(
    version: number,
    level: 'gene' | 'transcript',
    disease: Dataset,
    selectedModules: SpongEffectsModule[],
  ): Promise<PlotlyData> {

    if (selectedModules.length === 0) {
      return { data: [], layout: {}, config: {} };
    }

    let elements: string[] = selectedModules.map((s) => s.ensemblID);

    if (this.formGroup.get('includeModuleMembers')?.value) {
      elements.push(...Array.from(this.moduleMembersMap().values()).flat().map(m => m.ensemblID));
      elements = [...new Set(elements)];
    }

    this.elementLimitWarning = false;

    const MAX_ELEMENTS = 100;
    if (elements.length > MAX_ELEMENTS) {
      elements = elements.slice(0, MAX_ELEMENTS);
      this.elementLimitWarning = true;
      console.warn(`Limited elements to ${MAX_ELEMENTS} to prevent performance issues`);
    }

    const apiResponse = await this.backend.getExpression(
      version,
      elements,
      disease,
      level,
    );

    const typeSplit: Map<string, GeneExpression[] | TranscriptExpression[]> = new Map<string, any[]>();
    apiResponse.forEach((entry) => {
      const dataset: string = entry.dataset.disease_subtype ? entry.dataset.disease_subtype : entry.dataset.disease_name;
      if (!typeSplit.has(dataset)) {
        typeSplit.set(dataset, []);
      }
      typeSplit.get(dataset)?.push(entry as GeneExpression & TranscriptExpression);
    });

    let data: any[] = [];
    typeSplit.forEach((entry, dataset) => {
      const xSamples = entry.map((e) => e.sample_ID);
      const yElements = entry.map((e) => 'gene' in e ? e.gene.ensg_number : e.transcript.enst_number);
      const zValues = entry.map((e) => e.expr_value);

      data.push({
        z: zValues,
        x: xSamples,
        y: yElements,
        type: 'heatmap',
        hoverongaps: false,
        name: dataset,
        showscale: false,
      });
    });

    if (data.length > 0) {
      data[data.length - 1].showscale = true;

      data.slice(1).forEach((d, i) => {
        let idx: string = (i + 2).toString();
        d.xaxis = 'x' + idx;
      });
    }

    const layout = {
      autosize: true,
      xaxis: {
        ticks: '',
        showticklabels: false,
        title: 'Sample ID',
        automargin: true,
      },
      yaxis: {
        title: ('Module center' + (level === 'gene' ? ' gene' : ' transcript')) + (this.formGroup.get('includeModuleMembers')?.value ? ' and module members' : ''),
        automargin: true,
      },
      title: {
        text: 'Expression of selected modules',
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      grid: {
        rows: 1,
        columns: data.length,
      },
      annotations: [],
    };
    let config = {
      responsive: true,
    };
    return { data: data, layout: layout, config: config };
  }

  plotModuleExpression(config: PlotlyData | undefined) {
    if (this.moduleExpressionData.isLoading()) {
      Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
      return;
    }

    if (!config || !config.data || config.data.length === 0 || this.selectedModules().length === 0) {
      Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
      return;
    }

    Plotly.newPlot(
      this.moduleExpressionHeatmap().nativeElement,
      config.data,
      config.layout,
      config.config,
    );
  }

  async getSpongEffectRuns(version: number) {
    const SE_run: SpongEffectsRun[] = await this.backend.getSpongEffectsRuns(version);
    // add each spongeffectsrun to the map with the spongEffectsRunID as key
    SE_run.forEach((run) => {
        this.spongEffectRuns.set(run.spongEffects_run_ID, run);
    });
  }

  spongEffectsRunParamsString(spongEffectsRunID: number): string {
    const spongEffectsRun = this.spongEffectRuns.get(spongEffectsRunID);
    if (!spongEffectsRun) {
      return 'No parameters available';
    }
    const paramString: string = "mscor threshold: " + spongEffectsRun.m_scor_threshold + 
                                "\npAdjust threshold: " + spongEffectsRun.p_adj_threshold + 
                                "\nmodules cutoff: " + spongEffectsRun.modules_cutoff
    return paramString
  }

}