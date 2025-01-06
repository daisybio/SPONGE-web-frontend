import { Component, ElementRef, inject, ViewChild, Input } from '@angular/core';
import { PlotlyData } from '../../../../interfaces';
import { ClassPerformancePlotComponent } from '../../explore/plots/class-performance-plot/class-performance-plot.component';

declare var Plotly: any;

@Component({
  selector: 'app-prediction-results',
  standalone: true,
  providers: [
    ClassPerformancePlotComponent
  ],
  templateUrl: './prediction-results.component.html',
  styleUrls: ['./prediction-results.component.scss']
})
export class PredictionResultsComponent {
  @Input() responseJson: any;
  @Input() classPerformancePlot: any;

  @ViewChild('typePredictPiePlot', { static: false }) typePredictPiePlot!: ElementRef<HTMLDivElement>;

  classPerformanceComponent = inject(ClassPerformancePlotComponent);
  predictedType: string = "None";
  predictedSubtype: string = "None";
  predictionMeta: any;
  predictionData: any;

  constructor() {}

  ngOnInit(): void {
    this.classPerformancePlot = this.classPerformanceComponent.classPerformPlot;
    console.log(this.classPerformancePlot);
    console.log(this.responseJson);
    this.extractPredictions(this.responseJson);
  }

  async processPredictions(predictionResponse: any): Promise<any> {
    // check response
    if (!predictionResponse.ok) {
      throw new Error(`File upload failed with status code: ${predictionResponse.status}`);
    }
    // save results
    const predictionData = await predictionResponse.json();
    this.predictionData = predictionData.data;
    this.predictionMeta = predictionData.meta[0];
    this.predictedType = predictionData.meta[0].type_predict;
    this.predictedSubtype = predictionData.meta[0].subtype_predict;
    // plot predictions
    this.extractPredictions(predictionData)
      .then(data => this.plotPredictions(data));
  }

  async plotPredictions(plotlyData: PlotlyData): Promise<void> {
    Plotly.newPlot(this.typePredictPiePlot.nativeElement, plotlyData.data, plotlyData.layout, plotlyData.config);
  }

  async extractPredictions(responseJson: any): Promise<PlotlyData> {
    const typeGroups: Map<string, string[]> = new Map<string, string[]>();
    // group predictions by type
    console.log(responseJson)
    responseJson.data.forEach((entry: { typePrediction: string; subtypePrediction: string; }) => {
      if (typeGroups.has(entry.typePrediction)) {
        typeGroups.get(entry.typePrediction)?.push(entry.subtypePrediction);
      } else {
        typeGroups.set(entry.typePrediction, [entry.subtypePrediction]);
      }
    });

    const typeCounts: Map<string, number> = new Map([...typeGroups.entries()].map(entry => {
      return [entry[0], entry[1].length];
    }));
    // sort by amount of samples
    const sortedTypeCounts: Map<string, number> = new Map([...typeCounts.entries()].sort((a, b) => b[1] - a[1]));
    let x: number[] = [...sortedTypeCounts.values()];
    let y: string[] = [...sortedTypeCounts.keys()];
    // add model accuracy
    let classPerformanceData = this.classPerformancePlot.data;
    // get modules data
    classPerformanceData = classPerformanceData.filter((d: { name: string; }) => d.name == "modules")
    if (classPerformanceData.length > 0) {
      classPerformanceData = classPerformanceData[0];
    }
    // create map to value
    const classToMeasure: Map<string, number> = new Map<string, number>();
    for (let i = 0; i < classPerformanceData.x.length; i++) {
      classToMeasure.set(classPerformanceData.y[i], classPerformanceData.x[i]);
    }
    // add accuracy to y labels
    y = y.map(label => {
      const accuracy = classToMeasure.get(label);
      return accuracy !== undefined ? `${label} (${accuracy.toFixed(2)})` : label;
    });

    const data: PlotlyData = {
      data: [{
        x: x,
        y: y,
        type: 'bar',
        orientation: 'h'
      }],
      layout: {
        title: 'Prediction Results',
        xaxis: { title: 'Number of Samples' },
        yaxis: { title: 'Predicted Types' }
      }
    };

    Plotly.newPlot('prediction-results-plot', data.data, data.layout);
    return data;
  }

  showError(message: string) {
    // Implement your error display logic here, e.g., using a snackbar or modal
    alert(message); // Simple alert for demonstration
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