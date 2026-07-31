import {Component, computed, effect, ElementRef, inject, input, model, resource, signal, Signal, viewChild, AfterViewInit, OnDestroy} from '@angular/core';
import {Metric, PlotlyData, RunClassPerformance, RunPerformance, SpongEffectsRun} from '../../../../../interfaces';
import {BackendService} from '../../../../../services/backend.service';
import {VersionsService} from '../../../../../services/versions.service';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ExploreService} from "../../service/explore.service";
import {InfoComponent} from "../../../../../components/info/info.component";

declare var Plotly: any;

@Component({
  selector: 'app-overall-acc-plot',
  imports: [
    MatExpansionModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    InfoComponent
  ],
  templateUrl: './overall-acc-plot.component.html',
  styleUrl: './overall-acc-plot.component.scss'
})
export class OverallAccPlotComponent implements AfterViewInit, OnDestroy {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();
  name_to_runPerformanceID: Map<number, string> = new Map<number, string>();

  overallAccPlot = viewChild.required<ElementRef<HTMLDivElement>>('overallAccuracyPlot');

  private resizeObserver: ResizeObserver | null = null;

  // plot parameters
  defaultPlotMode: string = "lines+markers";
  defaultLineWidth: number = 4;
  defaultMarkerSize: number = 10;

  plotOverallAccResource = resource({
    params: computed(() => {
      return {
        version: this.versionService.versionReadOnly()(),
        cancer: this.exploreService.selectedDisease$(),
        level: this.exploreService.level$(),
        params: this.exploreService.selectedParamSets$()
      }
    }),
    loader: async (param) => {
      const version = param.params.version;
      const cancer = param.params.cancer;
      const level = param.params.level;
      const params = param.params.params;
      if (version === undefined || cancer === undefined || level === undefined || params === undefined ) return;
      const data = this.getOverallAccuracyData(version, cancer, level, params);
      return await this.plotOverallAccuracyPlot(data);
    }
  });

  constructor() {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlot();
    });

    effect(() => {
      if (this.plotOverallAccResource.isLoading()) {
        const el = this.overallAccPlot()?.nativeElement;
        if (el) {
          Plotly.purge(el);
        }
      }
    });

    this.setupResizeObserver();
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.refreshPlot();
    });
  }

  ngAfterViewInit() {
    const el = this.overallAccPlot()?.nativeElement;
    if (el && this.resizeObserver) {
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  
  async getOverallAccuracyData(version: number, cancer: string, level: string, params: {[key: string]: any}): Promise<Metric[]> {
    const modelPerformances: RunPerformance[] = [];
    let highest_accuracy: number = 0;
    let highest_key: string = "";
    for (const [key, value] of Object.entries(params)) {
      const paramSet = value;
      const tmp = await this.backend.getRunPerformance(version, cancer, level, paramSet);
      if (Array.isArray(tmp)) {
        tmp.forEach((entry: RunPerformance) => {
          modelPerformances.push(entry);
          if (entry.model_type == "modules" && entry.split_type == "test") {
            if (entry.accuracy > highest_accuracy) {
              highest_accuracy = entry.accuracy;
              highest_key = key;
            }
          }
        });
      }
    }
    this.exploreService.highestKey.set(highest_key);
    // rename key of the highest accuracy to "*old_key"
    // params["*" + highest_key] = params[highest_key];
    // delete params[highest_key];
    // update this.exploreService.paramSets$
    // this.exploreService.paramSets$()()[highest_key] = params["*" + highest_key];

    // this is messy but still thinking about a cleaner way. 
    // the first time this is executed, all available params are wanted to all models are fetched
    // we create model Names (Model 1, Model 2, ...) and add them to the y-axis labels only if all models are fetched

    let metric = modelPerformances.map((entry: RunPerformance, idx: number): Metric => {
      // if id not yet in map, add it
      if (!this.name_to_runPerformanceID.has(entry.spongEffects_run_performance_ID)) {
        this.name_to_runPerformanceID.set(entry.spongEffects_run_performance_ID, 'Model ' + (idx + 1));
      }
      return {
        name: entry.model_type,
        split: entry.split_type,
        lower: entry.accuracy_lower,
        upper: entry.accuracy_upper,
        idx: idx + 1,
        spongEffecsRun: entry.spongEffects_run,
        spongEffects_run_performance_ID: entry.spongEffects_run_performance_ID
      };
    });
    return metric;
  };

  async plotOverallAccuracyPlot(metricData: Promise<Metric[]>): Promise<PlotlyData> {
    // set main layout options
    const layout = {
      title: 'Classification Accuracy per Model',
      autosize: true,
      yaxis: {
        showline: false,
        showticklabels: true,
        tickvals: [] as number[],
        ticktext: [] as string[]
      },
      margin: {
        t: 60,
        //   b: 40,
        //   l: 0,
        // r: 200,
      },
      annotations: [
        // x-axis label
        {
          xref: "paper",
          yref: "paper",
          x: 0.5,
          y: -0.1,
          xanchor: "center",
          yanchor: "top",
          text: "Overall Model Accuracy",
          showarrow: false
        }
      ],
      legend: {
        traceorder: "reversed",
        x: 1, // Position legend to the right
        xanchor: 'left',
        y: 1,
        yanchor: 'top'
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };
    const metrics: Metric[] = await metricData;
    const data = metrics.map(metric => {
      const col: string = metric.name == "modules" ? "green" : "orange"
      // Add model name to y-axis labels
      layout.yaxis.tickvals.push(metric.idx + 1);
      // this is a sequential numbering of the displayed models
      // layout.yaxis.ticktext.push(`Model ${metric.idx}`);
      // this is a fixed naming of the models 
      layout.yaxis.ticktext.push(this.name_to_runPerformanceID.get(metric.spongEffects_run_performance_ID)!);
      // data points
      return {
        x: [metric.lower, metric.upper],
        y: [metric.idx + 1, metric.idx + 1],
        mode: this.defaultPlotMode,
        name: metric.name + " (" + metric.split + ")",
        text: ["Lower Bound<br>(Accuracy)", "Upper Bound<br>(Accuracy)"],
        hovertemplate: "<i>%{text}: %{x:.2f}</i>" + 
          "<extra>Model parameters:" +
          "<br>mscor threshold: " + metric.spongEffecsRun.m_scor_threshold + 
          "<br>pAdjust threshold: " + metric.spongEffecsRun.p_adj_threshold + 
          "<br>modules cutoff: " + metric.spongEffecsRun.modules_cutoff + 
          "</extra>",
        line: {
          width: this.defaultLineWidth,
          color: col,
          dash: metric.split == "train" ? "solid" : "dash"
        },
        marker: {
          size: this.defaultMarkerSize,
          symbol: ['circle', 'diamond'],
          color: col
        },
        showlegend: false
      }
    });


    // Add custom legend entries
    const customLegend = [
      {
        x: [null],
        y: [null],
        mode: 'lines',
        name: 'Modules (Train)',
        line: {
          color: 'green',
          dash: 'solid'
        },
        type: 'scatter'
      },
      {
        x: [null],
        y: [null],
        mode: 'lines',
        name: 'Modules (Test)',
        line: {
          color: 'green',
          dash: 'dash'
        },
        type: 'scatter'
      },
      {
        x: [null],
        y: [null],
        mode: 'lines',
        name: 'Random (Train)',
        line: {
          color: 'orange',
          dash: 'solid'
        },
        type: 'scatter'
      },
      {
        x: [null],
        y: [null],
        mode: 'lines',
        name: 'Random (Test)',
        line: {
          color: 'orange',
          dash: 'dash'
        },
        type: 'scatter'
      }
    ];

    const config = {responsive: true};
    // remove loading spinner and show plot
    return Plotly.newPlot(this.overallAccPlot().nativeElement, [...data, ...customLegend], layout, config);
  }

  refreshPlot() {
    const plotDiv = this.overallAccPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }

  downloadPlot(format: 'png' | 'jpeg' | 'svg'): void {
    const el = this.overallAccPlot()?.nativeElement;
    if (el) {
      Plotly.downloadImage(el, {
        format: format,
        filename: 'overall_accuracy_plot_' + Date.now(),
        width: 800,
        height: 600
      });
    }
  }
}
