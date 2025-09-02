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
import { sum, groupBy, uniq } from 'lodash';
import { ExploreService } from '../../service/explore.service';
import { InfoComponent } from '../../../../../components/info/info.component';
import { MatCard } from "@angular/material/card";
// 
declare var Plotly: any;

interface PerformanceEntry {
  prediction_class: string;
  spongEffects_run: {
    model_type: string;
    split_type: string;
  };
  [key: string]: any;
}

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
  selectedDisease = this.exploreService.selectedDisease$;
  selectedModels = this.exploreService.selectedParamSets$;

  classPerformPlot = viewChild<ElementRef<HTMLDivElement>>(
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

  private readonly plotConfig = {
    responsive: true,
    displayModeBar: false,
  };

  private readonly colorPalette: Record<string, string> = {
    modules: 'green',
    random: 'orange',
  };

  plotlyData$ = computed(() => {
    const performanceData = this.runClassPerformance$.value() as PerformanceEntry[];
    console.log("CLASS PERFORMANCE DATA:")
    const selectedMeasure = this.performanceMeasure$();

    if (!performanceData?.length) {
      return { traces: [], layout: {} };
    }

    // Group data by training/testing split combination
    const splitGroups = this.groupBySplits(performanceData);
    console.log("SPLIT GROUPS:", splitGroups);
    const uniqueClasses = this.getUniqueClasses(performanceData);
    console.log("UNIQUE CLASSES:", uniqueClasses);
    const uniqueModelTypes = this.getUniqueModelTypes(performanceData);
    console.log("UNIQUE MODEL TYPES:", uniqueModelTypes);

    // Create subplot structure
    const subplotTitles = Object.keys(splitGroups);
    const traces = this.createTraces(splitGroups, selectedMeasure.value, uniqueModelTypes, uniqueClasses);
    const layout = this.createLayout(subplotTitles, selectedMeasure.viewValue, uniqueClasses.length);

    return { traces, layout };
  });

  constructor() {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlot();
    });

    effect(() => {
      const { traces, layout } = this.plotlyData$();
      
      if (!traces.length) {
        return;
      }

      if (this.classPerformPlot()?.nativeElement) {
        Plotly.newPlot(
          this.classPerformPlot()?.nativeElement,
          traces,
          layout,
          this.plotConfig,
        );
      }
    });
  }

  // split the data into two subplots for test and train 
  private groupBySplits(data: PerformanceEntry[]): Record<string, PerformanceEntry[]> {
    return groupBy(data, (entry) => {
      const run = entry.spongEffects_run;
      const split_type = run.split_type === 'train' ? 'Train' : 'Test';
      return split_type;
    });
  }

  private getUniqueClasses(data: PerformanceEntry[]): string[] {
    return uniq(data.map(entry => entry.prediction_class)).sort();
  }

  private getUniqueModelTypes(data: PerformanceEntry[]): string[] {
    return uniq(data.map(entry => entry.spongEffects_run.model_type)).sort();
  }

  private createTraces(
    splitGroups: Record<string, PerformanceEntry[]>,
    measureKey: string,
    modelTypes: string[],
    classes: string[]
  ): any[] {
    const traces: any[] = [];
    const subplotTitles = Object.keys(splitGroups);
    
    subplotTitles.forEach((splitKey, splitIndex) => {
      const splitData = splitGroups[splitKey];
      const modelGroups = groupBy(splitData, entry => entry.spongEffects_run.model_type);

      modelTypes.forEach((modelType, modelIndex) => {
        const modelData = modelGroups[modelType] || [];
        
        if (modelData.length === 0) return;

        const trace = {
          x: classes,
          y: classes.map(predictionClass => {
            const entriesForClass = modelData.filter(entry => entry.prediction_class === predictionClass);
            const values = entriesForClass.map(entry => entry[measureKey]);
            if (values.length === 0) return null;
            // Calculate mean
            return values.reduce((sum, v) => sum + v, 0) / values.length;
          }),
          type: 'bar',
          name: modelType,
          legendgroup: modelType,
          showlegend: splitIndex === 0, // Only show legend for first subplot
          marker: {
            color: this.colorPalette[modelType] || 'gray',
          },
          xaxis: `x${splitIndex + 1}`,
          yaxis: `y${splitIndex + 1}`,
        };

        traces.push(trace);
      });
    });
    console.log("TRACES:", traces);
    return traces;
  }

  private createLayout(
    subplotTitles: string[],
    measureLabel: string,
    maxClassCount: number
  ): any {
    const cols = 1;
    const rows = 2;
    console.log("MODELS: ", this.selectedModels()(),Object.keys(this.selectedModels()()).length );
    const layout: any = {
      height: 500,
      showlegend: true,
      barmode: 'group',
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: {
        t: 0,
        b: maxClassCount > 5 ? 120 : 60,
        l: 80,
        r: 10,
      },
      legend: {
        orientation: 'h',
        x: 1,
        xanchor: 'right',
        y: 1,
        yanchor: 'bottom',
      },
      grid: {
        rows: rows,
        columns: cols,
        pattern: 'independent',
      },
      yaxis1: {
        domain: this.selectedDisease() === 'pancancer' ? [0, 0.1] : [0, 0.35],
      },
      yaxis2: {
        domain: this.selectedDisease() === 'pancancer' ? [0.9, 1] : [0.65, 1],
      },
      xaxis1:  {
        title: this.selectedDisease() === 'pancancer' ? 'Prediction class (Cancer type)' : 'Prediction class (Cancer subtype)' 
      },
      // Add subplot titles
      annotations: [{
        text: subplotTitles[0],  // Train 
        x: 0.5,
        y: 1,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'center',
        yanchor: 'bottom',
        showarrow: false,
        font: {
          size: 18,
        },
      },
      {
        text: subplotTitles[1],  // Test
        x: 0.5,
        y: 0.35,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'center',
        yanchor: 'bottom',
        showarrow: false,
        font: {
          size: 18,
        },
      },
      // yaxis label
      {
        text: Object.keys(this.selectedModels()()).length > 1
          ? `${measureLabel}<br>(mean over models selected on the left)<br> <br> ` // newlines added for spacing
          : `${measureLabel}<br>(of model selected on the left)<br> <br> `,
        x: 0,
        y: 0.5,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'right',
        yanchor: 'middle',
        showarrow: false,
        font: {
          size: 14,
        },
        textangle: -90,
      }
    ]
    };

    return layout;
  }

  onPerformanceMeasureChange(measure: SelectElement): void {
    this.performanceMeasure$.set(measure);
  }

  refreshPlot(): void {
    const plotDivRef = this.classPerformPlot();
    if (plotDivRef?.nativeElement?.checkVisibility()) {
      Plotly.Plots.resize(plotDivRef.nativeElement);
    }
  }

  compareSelectElements(a: SelectElement, b: SelectElement): boolean {
    return a && b && a.value === b.value;
  }
}