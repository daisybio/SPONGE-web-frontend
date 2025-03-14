import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  resource,
  ResourceRef,
  signal,
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
  GeneExpression,
  PlotlyData,
  SpongEffectsGeneModuleMembers,
  SpongEffectsModule,
  SpongEffectsTranscriptModuleMembers,
  TranscriptExpression,
} from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { DataSource } from '@angular/cdk/collections';
import { Observable, ReplaySubject } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forEach } from 'lodash';

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
  moduleExpressionHeatmap = viewChild.required<ElementRef<HTMLDivElement>>(
    'moduleExpressionHeatmap',
  );

  // plot parameters
  defaultMarkerSize: number = 12;

  elementExpressionLoading: boolean = true;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(5, [
      Validators.min(3.0),
      Validators.max(100),
    ]),
    topControl: new FormControl<number>(10, [
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

  moduleExpressionData: ResourceRef<PlotlyData | undefined> = resource({
    request: () => {
      return {
        modules: this.selectedModules(),
      };
    },
    loader: (param) => {
      const version = this.versionService.versionReadOnly()();
      const disease = this.exploreService.selectedDiseaseObject$();
      const level = this.exploreService.level$();
      const selectedModules = param.request.modules;

      if (
        version === undefined ||
        disease === undefined ||
        level === undefined ||
        selectedModules === undefined
      ) {
        return new Promise((resolve, reject) => {
          resolve({ data: [], layout: {}, config: {} });
        });
      }

      return this.getModulesExpression(
        version,
        level,
        disease,
        selectedModules,
      );
    },
  });

  // update plots on form change
  clearEffect = effect(() => {
    this.exploreService.selectedDisease$();
    this.exploreService.level$();
    // this.clearPlot();
  });

  constructor() {
    // Update plots when form changes
    this.formGroup.valueChanges.subscribe(() => {
      // Refresh lollipop plot with new form values
      const lolipopData = this.lolipopPlotData.value();
      if (lolipopData) {
        this.plotLollipopPlot(lolipopData);
      }
      
      // Refresh heatmap if modules are selected
      if (this.selectedModules().length > 0) {
        const modules = this.moduleExpressionData.value();
        if (modules) {
          this.plotModuleExpression(modules);
        }
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
      return; 
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

    Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  }

  refreshPlot() {
    const plotDiv = this.lollipopPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }

  clearPlot() {
    Plotly.purge(this.lollipopPlot().nativeElement);
    Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
    this.dynamicModulesData.setData([]);
  }

  addModules(modules: SpongEffectsModule[], clickedSymbol?: string) {
    // console.log("addModules before", modules)
    // if (clickedSymbol === undefined) {
    //   this.selectedModules = signal(modules);
    // } else {
    //   if (this.selectedModules().filter(s => s.symbol === clickedSymbol).length === 0) {
    //     this.selectedModules().push(...modules);
    //   } else {
    //     this.selectedModules = signal(this.selectedModules().filter(s => s.symbol !== clickedSymbol));
    //   }
    // }
    // console.log("addModules after", this.selectedModules())

    this.selectedModules.set(modules);

    this.dynamicModulesData.setData(this.selectedModules());
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

    // include module members in heatmap
    if (this.formGroup.get('includeModuleMembers')?.value) {
      const members: Map<string, string[]> = await this.getModuleMembers(
        level,
        disease.disease_name,
        version,
      );
      console.log('members getModuleExpression', members);
      const memberValues: string[] = Array.from(members.values()).flat();

      const uniqueMembers = memberValues.filter(m => !elements.includes(m));
      elements.push(...uniqueMembers);
  
      elements.push(...memberValues);
      console.log('added', memberValues);
    }

    // Limit number of elements to avoid performance issues
    const MAX_ELEMENTS = 100;
    if (elements.length > MAX_ELEMENTS) {
      elements = elements.slice(0, MAX_ELEMENTS);
      console.warn(`Limited elements to ${MAX_ELEMENTS} to prevent performance issues`);
    }
  
    const apiResponse = await this.backend.getExpression(
      version,
      elements,
      disease,
      level,
    );

    // split into (sub-)types
    const typeSplit: Map<string, GeneExpression[] | TranscriptExpression[]> = new Map<string, any[]>();
    apiResponse.forEach((entry) => {
      const dataset: string = entry.dataset.disease_subtype ? entry.dataset.disease_subtype : entry.dataset.disease_name;
      if (!typeSplit.has(dataset)) {
        typeSplit.set(dataset, []);
      }
      typeSplit.get(dataset)?.push(entry as GeneExpression & TranscriptExpression);
    });

    // // build traces for each dataset
    let data: any[] = [];
    typeSplit.forEach((entry, dataset) => {

      const xSamples = entry.map((e) => e.sample_ID);
      const yElements = entry.map((e) => 'gene' in e ? e.gene.ensg_number : e.transcript.enst_number);
      const zValues = entry.map((e) => e.expr_value);

      // add trace
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
    // only show scale on last heatmap
    data[data.length - 1].showscale = true;
    // add x-axis subplot for each trace
    data.slice(1).forEach((d, i) => {
      let idx: string = (i + 2).toString();
      d.xaxis = 'x' + idx;
    });
    // set layout options
    const layout = {
      autosize: true,
      showlegend: true,
      legend: { orientation: 'h' },
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
        font: {
          size: 14,
        },
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
    if (config === undefined) {
      return;
    }
    Plotly.newPlot(
      this.moduleExpressionHeatmap().nativeElement,
      config.data,
      config.layout,
      config.config,
    );
  }

  async getModuleMembers(
    level: 'gene' | 'transcript',
    disease_name: string,
    version: number,
  ): Promise<Map<string, string[]>> {
    let response:
      | SpongEffectsGeneModuleMembers[]
      | SpongEffectsTranscriptModuleMembers[] = [];
    const members: Map<string, string[]> = new Map<string, string[]>();
    await Promise.all(
      this.selectedModules().map(async (s) => {
        members.set(s.ensemblID, []);
        
        if (level === 'gene') {
          const response = await this.backend.getSpongEffectsGeneModuleMembers(
            version,
            disease_name,
            s.ensemblID
          );
          
          response.forEach((e) => {
            members.get(s.ensemblID)!.push(e.gene.ensg_number);
          });
        } else { // transcript
          const response = await this.backend.getSpongEffectsTranscriptModuleMembers(
            version,
            disease_name,
            s.ensemblID
          );
          
          response.forEach((e) => {
            members.get(s.ensemblID)!.push(e.transcript.enst_number);
          });
        }
      })
    );
    
    return members;
  }
}
