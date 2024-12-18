import {Component, computed, effect, ElementRef, inject, input, resource, viewChild} from '@angular/core';
import {Metric, PlotlyData, RunPerformance} from '../../../../../interfaces';
import {BackendService} from '../../../../../services/backend.service';
import {VersionsService} from '../../../../../services/versions.service';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {ExploreService} from "../../service/explore.service";
import {InfoComponent} from "../../../../../components/info/info.component";

declare var Plotly: any;

@Component({
  selector: 'app-overall-acc-plot',
  imports: [
    MatExpansionModule,
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
export class OverallAccPlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();

  overallAccPlot = viewChild.required<ElementRef<HTMLDivElement>>('overallAccuracyPlot');

  // plot parameters
  defaultPlotMode: string = "lines+markers";
  defaultLineWidth: number = 4;
  defaultMarkerSize: number = 10;

  plotOverallAccResource = resource({
    request: computed(() => {
      return {
        version: this.versionService.versionReadOnly()(),
        cancer: this.exploreService.selectedDisease$(),
        level: this.exploreService.level$()
      }
    }),
    loader: async (param) => {
      const version = param.request.version;
      const gene = param.request.cancer;
      const level = param.request.level;
      if (version === undefined || gene === undefined || level === undefined) return;
      const data = this.getOverallAccuracyData(version, gene, level);
      return await this.plotOverallAccuracyPlot(data);
    }
  });

  constructor() {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlot();
    });
  }


  async getOverallAccuracyData(version: number, cancer: string, level: string): Promise<Metric[]> {
    const modelPerformances = await this.backend.getRunPerformance(version, cancer, level);
    return modelPerformances.map((entry: RunPerformance, idx: number): Metric => {
      return {
        name: entry.model_type,
        split: entry.split_type,
        lower: entry.accuracy_lower,
        upper: entry.accuracy_upper,
        idx: idx + 1
      }
    });
  };

  async plotOverallAccuracyPlot(metricData: Promise<Metric[]>): Promise<PlotlyData> {
    // set main layout options
    const layout = {
      autosize: true,
      yaxis: {
        showline: false,
        showticklabels: true,
        tickvals: [] as number[],
        ticktext: [] as string[]
      },
      margin: {
        t: 40,
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
          text: "Overall model accuracy",
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
      layout.yaxis.ticktext.push(`Model ${metric.idx}`);
      // data points
      return {
        x: [metric.lower, metric.upper],
        y: [metric.idx + 1, metric.idx + 1],
        mode: this.defaultPlotMode,
        name: metric.name + " (" + metric.split + ")",
        text: ["Lower Bound (Accuracy)", "Upper Bound (Accuracy)"],
        hovertemplate: "<i>%{text}: %{x:.2f}</i>",
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
}
