import {Component, computed, effect, ElementRef, inject, input, Renderer2, resource, ResourceRef, viewChild, ViewChild} from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {PlotlyData, SelectElement,} from '../../../../../interfaces';
import {VersionsService} from '../../../../../services/versions.service';
import {BackendService} from '../../../../../services/backend.service';
import {sum} from "lodash";
import {ExploreService} from "../../service/explore.service";
import {InfoComponent} from "../../../../../components/info/info.component";

declare var Plotly: any;

@Component({
  selector: 'app-class-performance-plot',
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
  templateUrl: './class-performance-plot.component.html',
  styleUrl: './class-performance-plot.component.scss'
})
export class ClassPerformancePlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();

  classPerformPlot = viewChild.required<ElementRef<HTMLDivElement>>('classPerformancePlot');

  performanceMeasures: SelectElement[] = [
    {value: 'balanced_accuracy', viewValue: "Balanced Accuracy"},
    {value: 'detection_prevalence', viewValue: "Detection Prevalence"},
    {value: 'detection_rate', viewValue: "Detection Rate"},
    {value: 'f1', viewValue: "F1"},
    {value: 'neg_pred_value', viewValue: "Negative Prediction Value"},
    {value: 'pos_pred_value', viewValue: "Positive Prediction Value"},
    {value: 'precision_value', viewValue: "Precision"},
    {value: 'prevalence', viewValue: "Prevalence"},
    {value: 'recall', viewValue: "Recall"},
    {value: 'sensitivity', viewValue: "Sensitivity"},
    {value: 'specificity', viewValue: "Specificity"}
  ];
  performanceMeasure: SelectElement = this.performanceMeasures[0];
  performanceSelectPanelIsOpen: boolean = false;
  includeModuleMembers: boolean = false;
  classPerformanceLoading: boolean = true;

  plotClassPerformanceResource = resource({
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
      return await this.plotModelClassPerformance(version, gene, level);
    }
  });


  constructor() {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlot();
    });
  }


  async plotModelClassPerformance(version: number, cancer: string, level: string): Promise<PlotlyData> {
    const performanceData = await this.backend.getRunClassPerformance(version, cancer, level);
    console.log(performanceData);
    // group the data by model type
    const traceGroups: { [key: string]: any[] } = {};
    performanceData.forEach(entry => {
      const modelType = entry.spongEffects_run.model_type;
      if (!traceGroups[modelType]) {
        traceGroups[modelType] = [];
      }
      traceGroups[modelType].push(entry);
    });
    // build actual traces
    const traces = [];
    for (const modelType in traceGroups) {
      if (traceGroups.hasOwnProperty(modelType)) {
        const group = traceGroups[modelType];

        const trace = {
          x: group.map(entry => entry.prediction_class),
          y: group.map(entry => entry[this.performanceMeasure.value]),
          type: 'bar',
          name: modelType,
        };

        traces.push(trace);
      }
    }
    const meanTextLength: number = Math.round(sum(traces[0].x.map(d => d.length)) / traces[0].x.length);
    const textPad: number = meanTextLength * 10.5;
    // const containerWidth = this.renderer.selectRootElement(this.classPerformancePlotDiv.nativeElement).offsetWidth;
    // const angle: number = meanTextLength > 15 ? 90: 0;
    // angle 90 if number of bars is greater than 10
    const uniqueBars = new Set(traces.flatMap(trace => trace.x)).size;
    const angle: number = uniqueBars > 10 ? -90 : 0;
    const layout = {
      barmode: 'group',
      autosize: true,
      // width: containerWidth,
      xaxis: {
        autosize: true,
        tickangle: angle
      },
      yaxis: {
        title: this.performanceMeasure.viewValue
      },
      margin: {
        t: 8,
        b: angle == -90 ? textPad : 40,
        l: 70,
        // r: 0
      },
      legend: {
        orientation: "h",
        x: 0.5,
        y: 1.25
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };
    const config = {responsive: true};
    return Plotly.newPlot(this.classPerformPlot().nativeElement, traces, layout, config);
  }

  refreshPlot() {
    const plotDiv = this.classPerformPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }



}
