import { Component, computed, effect, ElementRef, inject, input, resource, Signal, signal, viewChild } from '@angular/core';
import { FormControl, FormsModule, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { SpongEffectsModule, PlotlyData } from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { InfoComponent } from '../../../../../components/info/info.component';
import { DataSource } from '@angular/cdk/collections';
import { Observable, ReplaySubject } from 'rxjs';
import { MatInputModule } from '@angular/material/input';

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
    MatInputModule,
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss']
})
export class LollipopPlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();
  plot_data: SpongEffectsModule[] = [];

  lollipopPlot = viewChild.required<ElementRef<HTMLDivElement>>('lollipopPlot');

  // plot parameters
  defaultMarkerSize: number = 12;

  elementExpressionLoading: boolean = true;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(15, [Validators.min(3.0), Validators.max(100)]),
    topControl: new FormControl<number>(10, [Validators.min(1.0), Validators.max(20)]),
  });

  selectedModules: SpongEffectsModule[] = [];
  modulesTableColumns: string[] = [
    "ensemblID",
    "symbol",
    "meanGiniDecrease",
    "meanAccuracyDecrease",
    "description"
  ];
  dynamicModulesData: ModuleDataSource = new ModuleDataSource(this.selectedModules);

  lollipopPlotResource = resource({
    request: computed(() => {
      return {
        version: this.versionService.versionReadOnly()(),
        cancer: this.exploreService.selectedDisease$(),
        level: this.exploreService.level$(),
      }
    }),
    loader: async (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      if (version === undefined || cancer === undefined || level === undefined) return;
      // const data = this.getLollipopData(version, cancer, level);
      // return await this.plotLollipopPlot(data);
      this.plot_data = await this.getLollipopData(version, cancer, level);
      return this.plotLollipopPlot(this.plot_data);
    }
  });

  constructor() {
    const formSignal = signal(this.formGroup.value);
    this.formGroup.valueChanges.subscribe(val => formSignal.set(val))

    effect(() => {
      const config = formSignal();
      console.log("Lollipop plot effect")
    this.plotLollipopPlot(this.plot_data)

    });
  }  

  async getLollipopData(version: number, cancer: string, level: string): Promise<SpongEffectsModule[]> {
    if (level === "gene") {
      const query = await this.backend.getSpongEffectsGeneModules(version, cancer);
      return query.map(entry => ({
        ensemblID: entry.gene.ensg_number,
        symbol: entry.gene.gene_symbol,
        meanGiniDecrease: entry.mean_gini_decrease,
        meanAccuracyDecrease: entry.mean_accuracy_decrease,
      }));
    } else {
      const query = await this.backend.getSpongEffectsTranscriptModules(version, cancer);
      return query.map(entry => ({
        ensemblID: entry.transcript.enst_number,
        symbol: entry.transcript.enst_number,
        meanGiniDecrease: entry.mean_gini_decrease,
        meanAccuracyDecrease: entry.mean_accuracy_decrease,
      }));
    }
  }

  async plotLollipopPlot(plot_data: SpongEffectsModule[]): Promise<PlotlyData> {
    let giniData: SpongEffectsModule[] = plot_data;
    const redNodes: number = this.formGroup.value.markControl ?? 0;
    const n: number = this.formGroup.value.topControl ?? 0;
    let idx: number = n > giniData.length ? giniData.length : n;
    giniData = giniData.slice(0, idx);
    this.addModules(giniData.slice(0, redNodes));

    let data: any[] = [{
      x: giniData.map(g => g.meanGiniDecrease),
      y: giniData.map(g => g.meanAccuracyDecrease),
      mode: "markers",
      type: "scatter",
      name: giniData.map(g => g.symbol),
      text: giniData.map(g => g.symbol),
      marker: {
        size: this.defaultMarkerSize,
        color: giniData.map(g => this.selectedModules.includes(g) ? "red" : "grey")
      }
    }];

    const layout = {
      showlegend: false,
      autosize: true,
      hovermode: "closest",
      xaxis: {
        title: "Mean decrease in Gini-index"
      },
      yaxis: {
        title: "Mean decrease in accuracy"
      },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    };
    const config = {
      responsive: true
    };
    return Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  }


  clearEffect = effect(() => {
    this.exploreService.selectedDisease$();
    this.exploreService.level$();
    this.clearPlot();
  });

  refreshPlot() {
    const plotDiv = this.lollipopPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }

  clearPlot() {
    Plotly.purge(this.lollipopPlot().nativeElement);
    this.selectedModules = [];
    this.dynamicModulesData.setData([]);
  }

  addModules(modules: SpongEffectsModule[], clickedSymbol?: string) {
    if (clickedSymbol === undefined) {
      this.selectedModules = modules;
    } else {
      if (this.selectedModules.filter(s => s.symbol === clickedSymbol).length === 0) {
        this.selectedModules.push(...modules);
      } else {
        this.selectedModules = this.selectedModules.filter(s => s.symbol !== clickedSymbol);
      }
    }
    this.dynamicModulesData.setData(this.selectedModules);
  }
}