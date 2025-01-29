import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  resource,
  viewChild,
} from '@angular/core';
import { PlotlyData, PredictCancerType } from '../../../../interfaces';
import { ClassPerformancePlotComponent } from '../../explore/plots/class-performance-plot/class-performance-plot.component';
import { PredictFormComponent } from '../form/predict-form.component';
import { PredictService } from '../service/predict.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { InfoComponent } from '../../../../components/info/info.component';



declare var Plotly: any;

@Component({
  selector: 'app-prediction-results',
  standalone: true,
  providers: [ClassPerformancePlotComponent, PredictFormComponent],
  imports: [
    MatProgressSpinner,
    CommonModule,
    MatTableModule,
    MatExpansionModule,
    InfoComponent
  ],
  templateUrl: './prediction-results.component.html',
  styleUrls: ['./prediction-results.component.scss'],
})
export class PredictionResultsComponent  {
  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$
  predictionResource = this.predictService._prediction$;
  typePredictPiePlot = viewChild.required<ElementRef<HTMLDivElement>>('typePredictPiePlot');
  refreshSignal$ = input();

  predictionMeta$ = computed(() => this.prediction$()?.meta);
  predictionData$ = computed(() => this.prediction$()?.data);
  predictedType$ = computed(() => this.predictionMeta$()?.type_predict);
  predictedSubtype$ = computed(() => this.predictionMeta$()?.subtype_predict);

  plotlyTraces$ = inject(ClassPerformancePlotComponent).plotlyTraces$;

  refreshEffect = effect(() => {
    this.refreshSignal$();
    this.refreshPlot();
  });


  plotTypePredictPieResource = resource({
    request: computed(() => {
      return {
        data: this.prediction$(),
      };
    }),
    loader: async (param) => {
      const data = param.request.data;
      if (data === undefined) return;
      const plot_data = this.extractPredictions(data);     
      return await this.plotPredictions(plot_data);
    },
  })


  // clearEffect = effect(() => {
  //   this.predictService._query$
  //   this.clearPlot();
  // });
  

  async plotPredictions(plotlyData: PlotlyData): Promise<PlotlyData> {
    return Plotly.newPlot(
      this.typePredictPiePlot().nativeElement,
      plotlyData.data,
      plotlyData.layout,
      plotlyData.config,
    );
  }

  
  extractPredictions(responseJson: any): PlotlyData {
    const typeGroups: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();
    responseJson.data.forEach(
      (entry: { typePrediction: string; subtypePrediction: string }) => {
        if (!typeGroups.has(entry.typePrediction)) {
          typeGroups.set(entry.typePrediction, new Map<string, number>());
        }
        const subtypeMap = typeGroups.get(entry.typePrediction)!;
        if (subtypeMap.has(entry.subtypePrediction)) {
          subtypeMap.set(entry.subtypePrediction, subtypeMap.get(entry.subtypePrediction)! + 1);
        } else {
          subtypeMap.set(entry.subtypePrediction, 1);
        }
      },
    );

    const sortedTypeCounts: Map<string, Map<string, number>> = new Map(
      [...typeGroups.entries()].sort((a, b) => {
        const aCount = [...a[1].values()].reduce((sum, count) => sum + count, 0);
        const bCount = [...b[1].values()].reduce((sum, count) => sum + count, 0);
        return bCount - aCount;
      }),
    );

    const data: any[] = [];
    let colorIndex = 0;

    const subtypeColors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
      '#393b79', '#5254a3', '#6b6ecf', '#9c9ede', '#637939', '#8ca252', '#b5cf6b', '#cedb9c', '#8c6d31', '#bd9e39',
      '#17becf', '#bcbd22', '#7f7f7f', '#e377c2', '#8c564b', '#9467bd', '#d62728', '#2ca02c', '#ff7f0e', '#1f77b4',
      '#9edae5', '#dbdb8d', '#c7c7c7', '#f7b6d2', '#c49c94', '#c5b0d5', '#ff9896', '#98df8a', '#ffbb78', '#aec7e8',
      '#bd9e39', '#8c6d31', '#cedb9c', '#b5cf6b', '#8ca252', '#637939', '#9c9ede', '#6b6ecf', '#5254a3', '#393b79'
    ];

    sortedTypeCounts.forEach((subtypeMap, type) => {
      subtypeMap.forEach((count, subtype) => {
        data.push({
          x: [count],
          y: [type],
          text: [subtype],
          name: subtype,
          orientation: 'h',
          type: 'bar',
          marker: {
            color: subtypeColors[colorIndex % subtypeColors.length],
          },
        });
        colorIndex++;
      });
    });

    const layout = {
      barmode: 'stack',
      autosize: true,
      margin: {
        l: 250,
        r: 25,
        t: 50,
        b: 50,
      },
      xaxis: {
        title: 'Number of classified samples',
      },
      showlegend: false, 
      title: 'Predicted cancer types',
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    };

    const config = {
      responsive: true,
    };

    return { data, layout, config };

    // this does not work as before because we fetch only class performances for one selected cancer type
    // also rethink whether it is necessary to show class performance because the accuracy is from other data
    // add model accuracy
    // let classPerformanceData = this.plotlyTraces$();
    // console.log('classPerformanceData');
    // console.log(classPerformanceData);
    // // get modules data
    // classPerformanceData = classPerformanceData.filter(
    //   (d: { name: string }) => d.name == 'modules',
    // );
    // const oneMeasure = classPerformanceData[0];
    // console.log(oneMeasure);
    // // create map to value
    // const classToMeasure: Map<string, number> = new Map<string, number>();
    // for (let i = 0; i < oneMeasure.x.length; i++) {
    //   classToMeasure.set(oneMeasure.y[i], oneMeasure.x[i]);
    // }
    // // add accuracy to y labels
    // y = y.map((label) => {
    //   const accuracy = classToMeasure.get(label);
    //   return accuracy !== undefined
    //     ? `${label} (${accuracy.toFixed(2)})`
    //     : label;
    // });

    // const accValues: number[] = y.map((x_v) => classToMeasure.get(x_v) ?? 0);
    // // color based on balanced accuracy
    // const barColors: string[] = accValues.map((v) => this.getColorForValue(v));
  }

  // getColorForValue(value: number): string {
  //   const g: number = 140;
  //   const r: number = value >= 0.5 ? Math.round(255 * 2 * (1 - value)) : 255;
  //   const b: number = 0;
  //   return `rgb(${r},${g},${b})`;
  // }

  refreshPlot() {
    const plotDiv = this.typePredictPiePlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }

  clearPlot() {
    Plotly.purge(this.typePredictPiePlot().nativeElement);
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

  
}
