import {Component, computed, effect, ElementRef, inject, input, resource, signal, viewChild} from '@angular/core';
import {Metric, PlotlyData, RunPerformance, SpongEffectsGeneModules, SpongEffectsTranscriptModules} from '../../../../../interfaces';
import {BackendService} from '../../../../../services/backend.service';
import {VersionsService} from '../../../../../services/versions.service';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {ExploreService} from "../../service/explore.service";
import {InfoComponent} from "../../../../../components/info/info.component";
import { SpongEffectsModule } from '../../../../../interfaces';
import { MatGridListModule } from '@angular/material/grid-list';
import { DataSource } from '@angular/cdk/collections';
import { Observable, ReplaySubject } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';

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
    InfoComponent,
    MatGridListModule,
    MatTableModule,
    CommonModule,
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrl: './lollipop-plot.component.scss'
})
export class LollipopPlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();

  lollipopPlot = viewChild.required<ElementRef<HTMLDivElement>>('lollipopPlot');

  // plot parameters
  defaultMarkerSize: number = 12;

  elementExpressionLoading: boolean = true;

  markControl = new FormControl<number>(3) // , [Validators.min(1.0), Validators.max(20)])
  topControl = new FormControl<number>(200) // , [Validators.min(3.0), Validators.max(1000)])

  selectedModules: SpongEffectsModule[] = [];
  modulesTableColumns: string[] = [
    "ensemblID",
    "symbol",
    "meanGiniDecrease",
    "meanAccuracyDecrease",
    "description"
  ];
  dynamicModulesData: ModuleDataSource = new ModuleDataSource(this.selectedModules);

  // selectedEnsemblId: SpongEffectsModule;


  lollipopPlotResource = resource({
    request: computed(() => {
      return {
        version: this.versionService.versionReadOnly()(),
        cancer: this.exploreService.selectedDisease$(),
        level: this.exploreService.level$()
      }
    }),
    loader: async (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      if (version === undefined || cancer === undefined || level === undefined) return;
      const data = this.getLollipopData(version, cancer, level);
      return await this.plotLollipopPlot(data);
    }
  });


  constructor() {
    // const formSignal = signal(this.formGroup.value);
    // this.formGroup.valueChanges.subscribe(val => formSignal.set(val))

    effect(() => {
      // const config = formSignal();
      this.refreshSignal$();
      this.refreshPlot();
    });
  }

  async getLollipopData(version: number, cancer: string, level: string): Promise<SpongEffectsModule[]> {
    if (level == "gene") {
      const query = await this.backend.getSpongEffectsGeneModules(version, cancer);
      // transform data
      return query.map(entry => {
        return {
          ensemblID: entry.gene.ensg_number,
          symbol: entry.gene.gene_symbol,
          meanGiniDecrease: entry.mean_gini_decrease,
          meanAccuracyDecrease: entry.mean_accuracy_decrease,
        }
      });
    } else {
      const query = await this.backend.getSpongEffectsTranscriptModules(version, cancer);
      return query.map(entry => {
        return {
          ensemblID: entry.transcript.enst_number,
          symbol: entry.transcript.enst_number,
          meanGiniDecrease: entry.mean_gini_decrease,
          meanAccuracyDecrease: entry.mean_accuracy_decrease,
        }
      });
    }
  }


  async plotLollipopPlot(plot_data: Promise<SpongEffectsModule[]>): Promise<PlotlyData> {
    let giniData: SpongEffectsModule[] = await plot_data
    const redNodes: number = this.markControl.value ?? 0;
    // only use selected number of top genes
    if (this.topControl.value === null) {
      throw new Error("topControl value cannot be null");
    }
    const n: number = this.topControl.value;
    let idx: number = n > giniData.length ? giniData.length : n;
    giniData = giniData.slice(0, idx);
    // set selected elements
    this.addModules(giniData.slice(0, redNodes))

    // set main layout options
    let data: any[] = [{
      x: giniData.map(g => g.meanGiniDecrease),
      y: giniData.map(g => g.meanAccuracyDecrease),
      mode: "markers",
      type: "scatter",
      name: giniData.map(g => g.symbol),
      text: giniData.map(g => g.symbol),
      marker: {
        size: this.defaultMarkerSize,
        color: giniData.map(g => this.selectedModules.includes(g) ? "red": "grey")
      }
    }];

    const layout = {
      showlegend: false,
      autosize: true,
      hovermode: "closest",
      margin: {
        b: 50,
        l: 75,
        r: 25,
        t: 0
      },
      xaxis: {
        title: "Mean decrease in Gini-index"
      },
      yaxis: {
        title: "Mean decrease in accuracy"
      }
    };
    const config = {
      responsive: true
    };
    return Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  }

  refreshPlot() {
    const plotDiv = this.lollipopPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }


  addModules(modules: SpongEffectsModule[], clickedSymbol?: string) {
    if (clickedSymbol == undefined) {
      this.selectedModules = modules;
    } else {
      // modules are not inserted yet
      if (this.selectedModules.filter(s => s.symbol == clickedSymbol).length == 0) {
        // add new modules
        this.selectedModules.push(...modules);
      } else {
        // remove clicked modules
        this.selectedModules = this.selectedModules.filter(s => s.symbol != clickedSymbol);
      }
    }
    // update dynamic table data
    this.dynamicModulesData.setData(this.selectedModules);
  }


  // async exploreExpression() {
  //   // plot module expression
  //   this.getModulesExpression()
  //     .then(config => this.plotModuleExpression(config));
  //     // .then(_ => this.expressionsLoading = false);
  // }

  // async getModulesExpression(): Promise<PlotlyData> {
  //   let apiCall: any;
  //   let key: string;
  //   let elements: string[] = this.selectedModules.map(s => s.ensemblID);
  //   // include module members in heatmap
  //   if (this.includeModuleMembers) {
  //     const members: Map<string, string[]> = await this.getModuleMembers();
  //     const memberValues: string[] = [].concat([...members.values()]);
  //     elements.push(...memberValues);
  //   }

  //   if (this.level.toLowerCase() == "gene") {
  //     key = "ensg_number";
  //     apiCall = this.controller.get_expr(this.selectedCancer.viewValue,
  //       undefined, elements, undefined, this.level);
  //   } else {
  //     key = "enst_number";
  //     apiCall = this.controller.get_expr(this.selectedCancer.viewValue,
  //       elements, undefined, undefined, this.level);
  //   }
  //   // await apiCall
  //   const apiResponse = await apiCall;
  //   // split into (sub-)types
  //   const typeSplit: Map<string, any[]> = new Map<string, any[]>();
  //   apiResponse.forEach(entry => {
  //     const dataset: string = entry.dataset;
  //     if (!typeSplit.has(dataset)) {
  //       typeSplit.set(dataset, []);
  //     }
  //     typeSplit.get(dataset).push(entry);
  //   });

  //   // build traces for each dataset
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

  //     entry.forEach(e => {
  //       if (!xSet.has(e.sample_ID)) {
  //         xSamples.push(e.sample_ID);
  //         nX += 1;
  //       }
  //       if (!ySet.has(e.gene[key])) {
  //         yElements.push(e.gene.gene_symbol + " (" + e.gene[key] + ")");
  //         nY += 1;
  //       }
  //       zValues[nY][nX] = e.expr_value;
  //     });
  //     // add trace
  //     data.push({
  //       z: zValues,
  //       x: xSamples,
  //       y: yElements,
  //       type: "heatmap",
  //       hoverongaps: false,
  //       name: dataset,
  //       showscale: false
  //     });
  //   });
  //   // only show scale on last heatmap
  //   data[-1].showscale = true;
  //   // add x-axis subplot for each trace
  //   data.slice(1).forEach((d, i) => {
  //     let idx: string = (i+2).toString();
  //     d.xaxis = 'x' + idx
  //   });
  //   // set layout options
  //   const layout = {
  //     autosize: true,
  //     showlegend: true,
  //     legend: {orientation: "h"},
  //     xaxis: {
  //       showgrid: false,
  //       showticklabels: false,
  //       showticks: false
  //     },
  //     margin: {
  //       b: 125,
  //       l: 125,
  //       r: 50,
  //       t: 50
  //     },
  //     title: {
  //       text: "Module expression of selected modules",
  //       font: {
  //         size: 14
  //       }
  //     },
  //     grid: {
  //       rows: 1,
  //       columns: data.length
  //     },
  //     annotations: []
  //   };
  //   let config = {
  //     responsive: true
  //   }
  //   return {data: data, layout: layout, config: config};
  // }

  // plotModuleExpression(config: PlotlyData) {
  //   Plotly.newPlot(this.moduleExpressionHeatmap.nativeElement, config.data, config.layout, config.config);
  // }

}

