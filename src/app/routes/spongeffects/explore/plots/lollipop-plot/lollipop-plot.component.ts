import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  resource,
  ResourceRef,
  signal,
  ViewChild,
  viewChild,
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
import {
  Dataset,
  PlotlyData,
  SpongEffectsGeneModuleMembers,
  SpongEffectsModule,
  SpongEffectsTranscriptModuleMembers,
} from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { DataSource } from '@angular/cdk/collections';
import { Observable, ReplaySubject } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

declare var Plotly: any;

export class ModuleDataSource extends DataSource<SpongEffectsModule> {
  private _dataStream = new ReplaySubject<SpongEffectsModule[]>();

  constructor(initialData: SpongEffectsModule[]) {
    super();
    this.setData(initialData);
  }

  connect(): Observable<SpongEffectsModule[]> {
    return this._dataStream;
  }

  disconnect() {}

  setData(data: SpongEffectsModule[]) {
    this._dataStream.next(data);
  }
}

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
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class LollipopPlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();
  plot_data: SpongEffectsModule[] = [];
  // moduleExpressionData: PlotlyData = {data: [], layout: {}, config: {}};

  lollipopPlot = viewChild.required<ElementRef<HTMLDivElement>>('lollipopPlot');
  // moduleExpressionHeatmap = viewChild.required<ElementRef<HTMLDivElement>>(
  //   'moduleExpressionHeatmap',
  // );

  // plot parameters
  defaultMarkerSize: number = 12;

  elementExpressionLoading: boolean = true;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(10, [
      Validators.min(3.0),
      Validators.max(100),
    ]),
    topControl: new FormControl<number>(15, [
      Validators.min(1.0),
      Validators.max(20),
    ]),
    includeModuleMembers: new FormControl<boolean>(false),
  });
  formSignal = signal({});

  selectedModules: WritableSignal<SpongEffectsModule[]> = signal([]); //computed(() => (this.plot_data.slice(0, this.formGroup.value.markControl ?? 0)));

  modulesTableColumns: string[] = [
    'ensemblID',
    'symbol',
    'meanGiniDecrease',
    'meanAccuracyDecrease',
  ];
  dynamicModulesData: ModuleDataSource = new ModuleDataSource(
    this.selectedModules(),
  );

  // retrieve data and plot for the first time

  lolipopPlotData: ResourceRef<SpongEffectsModule[] | undefined> = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
    }),
    loader: (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      if (
        version === undefined ||
        cancer === undefined ||
        level === undefined
      ) {
        return new Promise((resolve, reject) => {
          resolve([]);
        });
      }
      return this.getLollipopData(version, cancer, level);
    },
  });

  // moduleExpressionData: ResourceRef<PlotlyData | undefined> = resource({
  //   request: () => {
  //     return {
  //       modules: this.selectedModules(),
  //     };
  //   },
  //   loader: (param) => {
  //     const version = this.versionService.versionReadOnly()();
  //     const disease = this.exploreService.selectedDiseaseObject$();
  //     const level = this.exploreService.level$();
  //     const selectedModules = param.request.modules;

  //     if (
  //       version === undefined ||
  //       disease === undefined ||
  //       level === undefined ||
  //       selectedModules === undefined
  //     ) {
  //       return new Promise((resolve, reject) => {
  //         resolve({ data: [], layout: {}, config: {} });
  //       });
  //     }

  //     return this.getModulesExpression(
  //       version,
  //       level,
  //       disease,
  //       selectedModules,
  //     );
  //   },
  // });

  // lollipopPlotResource = resource({
  //   request: computed(() => {
  //     return {
  //       version: this.versionService.versionReadOnly()(),
  //       cancer: this.exploreService.selectedDisease$(),
  //       level: this.exploreService.level$(),
  //     }
  //   }),
  //   loader: async (param) => {
  //     console.log("old resource")
  //     const version = param.request.version;
  //     const cancer = param.request.cancer;
  //     const level = param.request.level;
  //     if (version === undefined || cancer === undefined || level === undefined) {
  //       console.log("old resource return")
  //       return
  //     }
  //     this.plot_data = await this.getLollipopData(version, cancer, level);
  //     console.log("lollipopPlotResource Data", this.plot_data)
  //     // this.addModules(this.plot_data.slice(0, this.formGroup.value.markControl ?? 0));
  //     return this.plotLollipopPlot(this.plot_data);
  //   }
  // });

  // moduleExpressionResource = resource({
  //   request: () => {
  //     return {
  //       version: this.versionService.versionReadOnly()(),
  //       disease: this.exploreService.selectedDiseaseObject$(),
  //       level: this.exploreService.level$(),
  //       selectedModules: this.selectedModules()
  //     }
  //   },
  //   loader: async (param) => {
  //     const version = param.request.version;
  //     const disease = param.request.disease;
  //     const level = param.request.level;
  //     const selectedModules = param.request.selectedModules;
  //     // console.log("moduleExpressionResource", selectedModules)
  //     if (version === undefined || disease === undefined || level === undefined || selectedModules === undefined) return;
  //     this.moduleExpressionData = await this.getModulesExpression(version, level, disease, selectedModules);
  //     // console.log("moduleExpressionResource Data", this.moduleExpressionData)
  //     return this.plotModuleExpression(this.moduleExpressionData);
  //   }
  // });

  // resource = resource({
  //   request: () => (this.formSignal()),
  //   loader: (param) => {
  //     console.log("resource")

  //     // if (this.plot_data.length > 0) {
  //     //   this.plotLollipopPlot(this.plot_data)
  //     // }

  //     return new Promise((resolve, reject) => {
  //       resolve("helli")
  //     })
  //   }
  // })

  // lollipopPlotResource: ResourceRef<PlotlyData> = resource({
  //   request: () => (
  //     {
  //       lolipopData: this.lolipopPlotData.value(),
  //       formSignal: this.formSignal(),
  //     }
  //   ),
  //   loader: (param) => {
  //     if (param.request.lolipopData === undefined || param.request.lolipopData.length === 0) {
  //       return new Promise((resolve, reject) => {
  //         resolve({data: [], layout: {}, config: {}})
  //       })
  //     }
  //     console.log("yeehaw")
  //     return this.plotLollipopPlot(param.request.lolipopData);
  //   }
  // });

  // update plots on form change
  
  clearEffect = effect(() => {
    this.exploreService.selectedDisease$();
    this.exploreService.level$();
    // this.clearPlot();
  });

  constructor() {
    // const formSignal = signal({});
    this.formGroup.valueChanges.subscribe((val) => this.formSignal.set(val));

    effect(async () => {
      const lolipopData = this.lolipopPlotData.value();
      const formSignal = this.formSignal();
      // this.addModules(this.selectedModules(), 'test');
      this.plotLollipopPlot(lolipopData);

      // const config = formSignal();
      // this.plotLollipopPlot(this.plot_data)
      // this.addModules(this.plot_data.slice(0, config.markControl ?? 0));
      // console.log(this.selectedModules())
      // this.moduleExpressionData = await this.getModulesExpression(this.versionService.versionReadOnly()(), this.exploreService.level$(), this.exploreService.selectedDiseaseObject$(), this.selectedModules());
      // console.log("constructor", this.moduleExpressionData)
      // this.plotModuleExpression(this.moduleExpressionData)
    });

    // effect(() => {
    //   const modules = this.moduleExpressionData.value();
      // this heatmap his too big -> page crashes
      // this.plotModuleExpression(modules)
    // });
  }

  async getLollipopData(
    version: number,
    cancer: string,
    level: string,
  ): Promise<SpongEffectsModule[]> {
    if (level === 'gene') {
      const query = await this.backend.getSpongEffectsGeneModules(
        version,
        cancer,
      );
      return query.map((entry) => ({
        ensemblID: entry.gene.ensg_number,
        symbol: entry.gene.gene_symbol,
        meanGiniDecrease: entry.mean_gini_decrease,
        meanAccuracyDecrease: entry.mean_accuracy_decrease,
      }));
    } else {
      const query = await this.backend.getSpongEffectsTranscriptModules(
        version,
        cancer,
      );
      return query.map((entry) => ({
        ensemblID: entry.transcript.enst_number,
        symbol: entry.transcript.enst_number,
        meanGiniDecrease: entry.mean_gini_decrease,
        meanAccuracyDecrease: entry.mean_accuracy_decrease,
      }));
    }
  }

  async plotLollipopPlot(plot_data: SpongEffectsModule[] | undefined) {
    if (plot_data === undefined) {
      return; //{data: [], layout: {}, config: {}};
    }

    let giniData: SpongEffectsModule[] = plot_data;

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
            this.selectedModules().includes(g) ? 'red' : 'grey',
          ),
        },
      },
    ];

    const layout = {
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

    // this.lollipopPlot().nativeElement.addEventListener('plotly_click', (event: any) => {
    //   console.log('click', event);
    //   const pointIndex = event.points[0].pointIndex;
    //   const clickedModule = giniData[pointIndex];
    //   this.toggleModule(clickedModule);
    //   console.log('clicked', clickedModule);
    // });

    Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  
  }

  toggleModule(module: SpongEffectsModule) {
    const selectedModules = this.selectedModules();
    const moduleIndex = selectedModules.findIndex(
      (m) => m.ensemblID === module.ensemblID,
    );

    if (moduleIndex === -1) {
      // Module is not selected, add it
      this.selectedModules.set([...selectedModules, module]);
    } else {
      // Module is already selected, remove it
      this.selectedModules.set(
        selectedModules.filter((m) => m.ensemblID !== module.ensemblID),
      );
    }

    this.dynamicModulesData.setData(this.selectedModules());
    this.plotLollipopPlot(this.plot_data);
  }

  refreshPlot() {
    const plotDiv = this.lollipopPlot().nativeElement;
    // const plotDiv2 = this.moduleExpressionHeatmap().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
    // if (plotDiv2.checkVisibility()) {
    //   Plotly.Plots.resize
    // }
  }

  clearPlot() {
    Plotly.purge(this.lollipopPlot().nativeElement);
    // this.selectedModules = signal([]);
    this.dynamicModulesData.setData([]);
    // Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
  }

  addModules(modules: SpongEffectsModule[], clickedSymbol?: string) {
    console.log("addModules before", modules)
    if (clickedSymbol === undefined) {
      this.selectedModules = signal(modules);
    } else {
      if (this.selectedModules().filter(s => s.symbol === clickedSymbol).length === 0) {
        this.selectedModules().push(...modules);
      } else {
        this.selectedModules = signal(this.selectedModules().filter(s => s.symbol !== clickedSymbol));
      }
    }
    console.log("addModules after", this.selectedModules())

    // this.selectedModules.set(modules);

    this.dynamicModulesData.setData(this.selectedModules());
  }

  // async getModulesExpression(
  //   version: number,
  //   level: 'gene' | 'transcript',
  //   disease: Dataset,
  //   selectedModules: SpongEffectsModule[],
  // ): Promise<PlotlyData> {
  //   const key = level === 'gene' ? 'ensg_number' : 'enst_number';
  //   let elements: string[] = selectedModules.map((s) => s.ensemblID);

  //   // include module members in heatmap
  //   if (this.formGroup.get('includeModuleMembers')?.value) {
  //     const members: Map<string, string[]> = await this.getModuleMembers(
  //       level,
  //       disease.disease_name,
  //       version,
  //     );
  //     const memberValues: string[] = Array.from(members.values()).flat();
  //     elements.push(...memberValues);
  //   }
  //   const apiResponse = await this.backend.getExpression(
  //     version,
  //     elements,
  //     disease,
  //     level,
  //   );
  //   // only use first 100 elements
  //   apiResponse.splice(100);

  //   // split into (sub-)types
  //   const typeSplit: Map<string, any[]> = new Map<string, any[]>();
  //   apiResponse.forEach((entry) => {
  //     const dataset: string = entry.dataset;
  //     if (!typeSplit.has(dataset)) {
  //       typeSplit.set(dataset, []);
  //     }
  //     typeSplit.get(dataset)?.push(entry);
  //   });

  //   // // build traces for each dataset
  //   let data: any[] = [];
  //   typeSplit.forEach((entry: any[], dataset: string) => {
  //     // transform data of entries
  //     let xSamples: string[] = [];
  //     const xSet: Set<string> = new Set<string>();
  //     let nX: number = -1;
  //     let yElements: string[] = [];
  //     const ySet: Set<string> = new Set<string>();
  //     let nY: number = -1;
  //     let zValues: number[][] = [[]];

  //     entry.forEach((e) => {
  //       if (!xSet.has(e.sample_ID)) {
  //         xSamples.push(e.sample_ID);
  //         nX += 1;
  //       }
  //       if (!ySet.has(e.gene[key])) {
  //         yElements.push(e.gene.gene_symbol + ' (' + e.gene[key] + ')');
  //         nY += 1;
  //       }
  //       zValues[nY][nX] = e.expr_value;
  //     });
  //     // add trace
  //     data.push({
  //       z: zValues,
  //       x: xSamples,
  //       y: yElements,
  //       type: 'heatmap',
  //       hoverongaps: false,
  //       name: dataset,
  //       showscale: false,
  //     });
  //   });
  //   // only show scale on last heatmap
  //   data[data.length - 1].showscale = true;
  //   // add x-axis subplot for each trace
  //   data.slice(1).forEach((d, i) => {
  //     let idx: string = (i + 2).toString();
  //     d.xaxis = 'x' + idx;
  //   });
  //   // set layout options
  //   const layout = {
  //     autosize: true,
  //     showlegend: true,
  //     legend: { orientation: 'h' },
  //     xaxis: {
  //       showgrid: false,
  //       showticklabels: false,
  //       showticks: false,
  //     },
  //     margin: {
  //       b: 125,
  //       l: 125,
  //       r: 50,
  //       t: 50,
  //     },
  //     title: {
  //       text: 'Module expression of selected modules',
  //       font: {
  //         size: 14,
  //       },
  //     },
  //     paper_bgcolor: 'rgba(0,0,0,0)',
  //     plot_bgcolor: 'rgba(0,0,0,0)',
  //     grid: {
  //       rows: 1,
  //       columns: data.length,
  //     },
  //     annotations: [],
  //   };
  //   let config = {
  //     responsive: true,
  //   };

  //   return { data: data, layout: layout, config: config };
  // }

  // plotModuleExpression(config: PlotlyData | undefined) {
  //   if (config === undefined) {
  //     return;
  //   }
  //   Plotly.newPlot(
  //     this.moduleExpressionHeatmap().nativeElement,
  //     config.data,
  //     config.layout,
  //     config.config,
  //   );
  // }

  // async getModuleMembers(
  //   level: 'gene' | 'transcript',
  //   disease_name: string,
  //   version: number,
  // ): Promise<Map<string, string[]>> {
  //   let response:
  //     | SpongEffectsGeneModuleMembers[]
  //     | SpongEffectsTranscriptModuleMembers[] = [];
  //   const members: Map<string, string[]> = new Map<string, string[]>();
  //   if (level === 'gene') {
  //     response = await this.backend.getSpongEffectsGeneModuleMembers(
  //       version,
  //       disease_name,
  //       this.selectedModules()
  //         .map((s) => s.ensemblID)
  //         .join(','),
  //     );
  //     response.forEach((e) => {
  //       if (!members.has(e['hub_ensg_number'] as string))
  //         members.set(e['hub_ensg_number'] as string, []);
  //       members
  //         .get(e['hub_ensg_number'])
  //         ?.push(e.member_ensg_number, e.member_gene_symbol);
  //     });
  //   } else {
  //     response = await this.backend.getSpongEffectsTranscriptModuleMembers(
  //       version,
  //       disease_name,
  //       this.selectedModules()
  //         .map((s) => s.ensemblID)
  //         .join(','),
  //     );
  //     response.forEach((e) => {
  //       if (!members.has(e['hub_enst_number']))
  //         members.set(e['hub_enst_number'], []);
  //       members
  //         .get(e['hub_enst_number'])
  //         ?.push(
  //           e.member_gene.ensg_number,
  //           e.member_gene.gene_symbol,
  //           e.member_enst_number,
  //         );
  //     });
  //   }
  //   return members;
  // }
}
