import {
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { PlotlyData } from '../../../../interfaces';
import { ClassPerformancePlotComponent } from '../../explore/plots/class-performance-plot/class-performance-plot.component';
import { PredictFormComponent } from '../form/predict-form.component';
import { PredictService } from '../service/predict.service';

declare var Plotly: any;

@Component({
  selector: 'app-prediction-results',
  standalone: true,
  providers: [ClassPerformancePlotComponent, PredictFormComponent],
  templateUrl: './prediction-results.component.html',
  styleUrls: ['./prediction-results.component.scss'],
})
export class PredictionResultsComponent {
  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$;
  typePredictPiePlot =
    viewChild.required<ElementRef<HTMLDivElement>>('typePredictPiePlot');

  predictionMeta$ = computed(() => this.prediction$()?.meta);
  predictionData$ = computed(() => this.prediction$()?.data);
  predictedType$ = computed(() => this.predictionMeta$()?.type_predict);
  predictedSubtype$ = computed(() => this.predictionMeta$()?.subtype_predict);

  async plotPredictions(plotlyData: PlotlyData): Promise<void> {
    Plotly.newPlot(
      this.typePredictPiePlot().nativeElement,
      plotlyData.data,
      plotlyData.layout,
      plotlyData.config,
    );
  }

  /*
  extractPredictions(responseJson: PredictCancerType): PlotlyData {
    const typeGroups: Map<string, string[]> = new Map<string, string[]>();
    // group predictions by type
    console.log(responseJson);
    responseJson.data.forEach(
      (entry: { typePrediction: string; subtypePrediction: string }) => {
        if (typeGroups.has(entry.typePrediction)) {
          typeGroups.get(entry.typePrediction)?.push(entry.subtypePrediction);
        } else {
          typeGroups.set(entry.typePrediction, [entry.subtypePrediction]);
        }
      },
    );

    const typeCounts: Map<string, number> = new Map(
      [...typeGroups.entries()].map((entry) => {
        return [entry[0], entry[1].length];
      }),
    );
    // sort by amount of samples
    const sortedTypeCounts: Map<string, number> = new Map(
      [...typeCounts.entries()].sort((a, b) => b[1] - a[1]),
    );
    let x: number[] = [...sortedTypeCounts.values()];
    let y: string[] = [...sortedTypeCounts.keys()];
    // add model accuracy
    let classPerformanceData = this.classPerformancePlot.data;
    // get modules data
    classPerformanceData = classPerformanceData.filter(
      (d: { name: string }) => d.name == 'modules',
    );
    if (classPerformanceData.length > 0) {
      classPerformanceData = classPerformanceData[0];
    }
    // create map to value
    const classToMeasure: Map<string, number> = new Map<string, number>();
    for (let i = 0; i < classPerformanceData.x.length; i++) {
      classToMeasure.set(classPerformanceData.y[i], classPerformanceData.x[i]);
    }
    // add accuracy to y labels
    y = y.map((label) => {
      const accuracy = classToMeasure.get(label);
      return accuracy !== undefined
        ? `${label} (${accuracy.toFixed(2)})`
        : label;
    });

    const accValues: number[] = y.map((x_v) => classToMeasure.get(x_v) ?? 0);
    // color based on balanced accuracy
    const barColors: string[] = accValues.map((v) => this.getColorForValue(v));

    let data = [
      {
        x: x,
        y: y,
        text: accValues.map((v) => 'Balanced accuracy: ' + v.toString()),
        type: 'bar',
        name: 'type',
        orientation: 'h',
        marker: {
          color: barColors,
        },
      },
    ];

    // add subtype traces
    if (this.predictFormComponent.formGroup.get('predictSubtypes')?.value) {
      const subtypeTraces: any[] = [...typeGroups.values()].map((sv) => {
        return {
          x: sv.length,
          y: y,
          text: sv,
          name: 'subtypes',
          orientation: 'h',
        };
      });
      data.push(...subtypeTraces);
    }

    const layout = {
      paper_bgcolor: 'white',
      autosize: true,
      barmode: 'group',
      margin: {
        l: 250,
        r: 25,
        t: 50,
        b: 50,
      },
      xaxis: {
        title: 'Number of samples classified',
      },
    };
    const config = {
      responsive: true,
    };
    return { data: data, layout: layout, config: config };
  }

  getColorForValue(value: number): string {
    const g: number = 140;
    const r: number = value >= 0.5 ? Math.round(255 * 2 * (1 - value)) : 255;
    const b: number = 0;
    return `rgb(${r},${g},${b})`;
  }

  // validateFileContent(file: File): boolean {
  //   // Perform basic validation, e.g., check file type and size
  //   // if (file.type !== this.acceptExpressionFiles()) {
  //   //   this.showError('Invalid file type. Please upload a text file.');
  //   //   return false;
  //   // }
  //   if (file.size > this.maxFileSize) {
  //     this.showError('File size exceeds the maximum limit.');
  //     return false;
  //   }
  //   // Additional content validation can be added here
  //   return true;
  // }

   */
}
