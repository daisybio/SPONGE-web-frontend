import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SelectElement } from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { sum } from 'lodash';
import { ExploreService } from '../../service/explore.service';
import { InfoComponent } from '../../../../../components/info/info.component';

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
    InfoComponent,
  ],
  standalone: true,
  templateUrl: './class-performance-plot.component.html',
  styleUrl: './class-performance-plot.component.scss',
})
export class ClassPerformancePlotComponent {
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();

  classPerformPlot = viewChild.required<ElementRef<HTMLDivElement>>(
    'classPerformancePlot',
  );

  runClassPerformance$ = this.exploreService.runClassPerformance$;

  performanceMeasures: SelectElement[] = [
    { value: 'balanced_accuracy', viewValue: 'Balanced Accuracy' },
    { value: 'detection_prevalence', viewValue: 'Detection Prevalence' },
    { value: 'detection_rate', viewValue: 'Detection Rate' },
    { value: 'f1', viewValue: 'F1' },
    { value: 'neg_pred_value', viewValue: 'Negative Prediction Value' },
    { value: 'pos_pred_value', viewValue: 'Positive Prediction Value' },
    { value: 'precision_value', viewValue: 'Precision' },
    { value: 'prevalence', viewValue: 'Prevalence' },
    { value: 'recall', viewValue: 'Recall' },
    { value: 'sensitivity', viewValue: 'Sensitivity' },
    { value: 'specificity', viewValue: 'Specificity' },
  ];

  performanceMeasure$ = signal<SelectElement>(this.performanceMeasures[0]);
  includeModuleMembers$ = signal<boolean>(false);

  plotlyTraces$ = computed(() => {
    const performanceData = this.runClassPerformance$.value();

    if (!performanceData) {
      return [];
    }

    const traceGroups: { [key: string]: any[] } = {};
    performanceData.forEach((entry) => {
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
          x: group.map((entry) => entry.prediction_class),
          y: group.map((entry) => entry[this.performanceMeasure$().value]),
          type: 'bar',
          name: modelType,
        };

        traces.push(trace);
      }
    }

    return traces;
  });

  constructor() {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlot();
    });

    effect(() => {
      const traces = this.plotlyTraces$();

      const meanTextLength: number = Math.round(
        sum(traces[0].x.map((d) => d.length)) / traces[0].x.length,
      );
      const textPad: number = meanTextLength * 10.5;
      // const containerWidth = this.renderer.selectRootElement(this.classPerformancePlotDiv.nativeElement).offsetWidth;
      // const angle: number = meanTextLength > 15 ? 90: 0;
      // angle 90 if number of bars is greater than 10
      const uniqueBars = new Set(traces.flatMap((trace) => trace.x)).size;
      const angle: number = uniqueBars > 10 ? -90 : 0;
      const layout = {
        barmode: 'group',
        autosize: true,
        // width: containerWidth,
        xaxis: {
          autosize: true,
          tickangle: angle,
        },
        yaxis: {
          title: this.performanceMeasure$().viewValue,
        },
        margin: {
          t: 8,
          b: angle == -90 ? textPad : 40,
          l: 70,
          // r: 0
        },
        legend: {
          orientation: 'h',
          x: 0.5,
          y: 1.25,
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
      };
      const config = { responsive: true };
      return Plotly.newPlot(
        this.classPerformPlot().nativeElement,
        traces,
        layout,
        config,
      );
    });
  }

  refreshPlot() {
    const plotDiv = this.classPerformPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }
}
