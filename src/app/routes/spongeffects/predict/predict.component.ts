import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatTabsModule} from '@angular/material/tabs';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSliderModule} from '@angular/material/slider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {MatProgressBarModule, ProgressBarMode} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatChipsModule} from '@angular/material/chips';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatRadioModule} from '@angular/material/radio';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatMenuModule} from '@angular/material/menu';
import {NgxDropzoneModule} from 'ngx-dropzone';
import {MatButtonModule} from '@angular/material/button';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {ExampleExpression, PlotlyData} from '../../../interfaces';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatOption} from '@angular/material/core';
import {timer} from 'rxjs';
import {BackendService} from '../../../services/backend.service';
import {VersionsService} from '../../../services/versions.service';

declare var Plotly: any;


const EXAMPLE_GENE_EXPR: ExampleExpression[] = [
  {id: "ENSG00000000233", sample1: 6, sample2: 5, sample3: 8, sample4: 2, sampleN: 1},
  {id: "ENSG00000000412", sample1: 2, sample2: 1, sample3: 2, sample4: 3, sampleN: 4},
  {id: "ENSG00000000442", sample1: 10, sample2: 9, sample3: 8, sample4: 0, sampleN: 7}
]

@Component({
  selector: 'app-predict',
  imports: [
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonToggleModule,
    MatMenuModule,
    NgxDropzoneModule,
    MatButtonModule,
    CommonModule,
    MatTableModule,
    FormsModule,
    ReactiveFormsModule,
    MatOption,
  ],
  templateUrl: './predict.component.html',
  styleUrl: './predict.component.scss'
})
export class PredictComponent {
  backend = inject(BackendService);
  versionService = inject(VersionsService);

  @ViewChild("classModelPerformancePlot") classPerformancePlotDiv!: ElementRef;
  typePredictPiePlot!: ElementRef;


  // example file
  showExpressionExample = false;
  exampleExpressionData: MatTableDataSource<any> = new MatTableDataSource<any>(EXAMPLE_GENE_EXPR);
  displayedCols: string[] = ["id", "sample1", "sample2", "sample3", "sample4", "sampleN"];
  displayedColsValueMap: Map<string, string> = new Map<string, string>([
    ["id", ""],
    ["sample1", "sample1"], ["sample2", "sample2"], ["sample3", "sample3"], ["sample4", "sample4"], ["sampleN", "sampleN"],
  ]);
  exampleExpressionFiles: File[] = [new File([JSON.stringify(EXAMPLE_GENE_EXPR)], "example_expression.txt")];
  // save example file


  uploadedExpressionFiles: File[] = [];


  // file params
  filesToAccept: string = "text/*,application/*";
  maxFileSize: number = 100000000;


  // prediction
  predictionQueried: boolean = false;
  predictionLoading: boolean = false;
  timerRunning: boolean = false;
  progressBarMode: ProgressBarMode = "determinate";
  progressBarValue: number = 0;
  estimatedRunTime: number = 0;


  // default parameters
  mscorDefault: number = 0.1;
  fdrDefault: number = 0.05;
  minSizeDefault: number = 100;
  maxSizeDefault: number = 2000;
  minExprDefault: number = 10;
  methods: string[] = ["gsva", "ssgsea", "OE"];
  methodDefault: string = this.methods[0];

  logScaling: boolean = true;
  predictSubtypes: boolean = false;

  // form controls
  formGroup = new FormGroup({
    mscor: new FormControl(this.mscorDefault, [Validators.min(0), Validators.max(1)]),
    fdr: new FormControl(this.fdrDefault, [Validators.min(0), Validators.max(1)]),
    minSize: new FormControl(this.minSizeDefault, [Validators.min(0)]),
    maxSize: new FormControl(this.maxSizeDefault, [Validators.min(0)]),
    minExpr: new FormControl(this.minExprDefault, [Validators.min(0)]),
    method: new FormControl(this.methodDefault),
    logScaling: new FormControl(this.logScaling),
    predictSubtypes: new FormControl(this.predictSubtypes),
  });
  // paramsSignal = toSignal(this.formGroup.valueChanges);


  // prediction data
  predictionData: any;
  predictionMeta: any;
  predictedType: string = "None";
  predictedSubtype: string = "None";


  constructor() {
  }


  // setInitialParams = effect(() => {
  //   this.formGroup.setValue({
  //     mscor: this.mscorDefault,
  //     fdr: this.fdrDefault,
  //     minSize: this.minSizeDefault,
  //     maxSize: this.maxSizeDefault,
  //     minExpr: this.minExprDefault,
  //     method: this.methodDefault,
  //     logScaling: this.logScaling,
  //     predictSubtypes: this.predictSubtypes
  //   });
  // })


  flipExampleExpression() {
    this.showExpressionExample = !this.showExpressionExample;
  }

  buttonText(btn: string) {
    if (btn == "expr") {
      return this.showExpressionExample ? "Hide example file" : "Show example file";
    } else {
      return "";
    }
  }

  expressionUploaded(): boolean {
    return this.uploadedExpressionFiles.length > 0;
  }

  onRemoveExpression(event: File) {
    this.uploadedExpressionFiles.splice(this.uploadedExpressionFiles.indexOf(event), 1);
    this.predictionQueried = false;
  }

  onExpressionUpload(event: any) {
    this.uploadedExpressionFiles.push(...event.addedFiles);
    // TODO: check format
  }

  acceptExpressionFiles(): string {
    return this.expressionUploaded() ? "none" : this.filesToAccept;
  }

  useExampleExpression(event: Event) {
    event.stopPropagation();
    this.uploadedExpressionFiles.push(...this.exampleExpressionFiles);
  }

  runButtonDisabled(): boolean {
    return !this.expressionUploaded() || this.predictionLoading;
  }

  estimateRunTime() {
    const fileSize: number = this.uploadedExpressionFiles[0].size / (1024 ** 2);
    const refSlope: number = 0.7;
    const x0: number = 17;
    const st: number = this.predictSubtypes ? 4 : 1;
    return refSlope * fileSize + x0;
  }

  async startTimer(): Promise<any> {
    this.timerRunning = true;
    this.progressBarValue = 0;
    const totalRunTime: number = this.estimateRunTime();
    this.estimatedRunTime = totalRunTime;
    const interval: number = (1000 * totalRunTime) / 100;
    const progressBarTimer = timer(0, interval);
    progressBarTimer.subscribe(() => {
      this.estimatedRunTime = totalRunTime * (100 - this.progressBarValue) / 100;
      if (this.progressBarValue < 100) this.progressBarValue++;
    });
  }

  getColorForValue(value: number): string {
    let g: number = 140;
    let r: number = value >= 0.5 ? Math.round(255 * 2 * (1 - value)) : 255;
    const b: number = 0;
    return `rgb(${r},${g},${b})`;
  }


  async extractPredictions(responseJson: any): Promise<PlotlyData> {
    const typeGroups: Map<string, string[]> = new Map<string, string[]>();
    // group predictions by type
    responseJson.data.forEach((entry: { typePrediction: string; subtypePrediction: string; }) => {
      if (typeGroups.has(entry.typePrediction)) {
        typeGroups.get(entry.typePrediction)?.push(entry.subtypePrediction);
      }
    });

    const typeCounts: Map<string, number> = new Map([...typeGroups.entries()].map(entry => {
      return [entry[0], entry[1].length];
    }));
    // sort by amount of samples
    const sortedTypeCounts: Map<string, number> = new Map([...typeCounts.entries()].sort((a, b) => a[1] - b[1]));
    let x: number[] = [...sortedTypeCounts.values()];
    let y: string[] = [...sortedTypeCounts.keys()];
    // add model accuracy
    let classPerformanceData = this.classPerformancePlotDiv.nativeElement.data;
    // get modules data
    classPerformanceData = classPerformanceData.filter((d: { name: string; }) => d.name == "modules")
    if (classPerformanceData.length > 0) {
      classPerformanceData = classPerformanceData[0];
    }
    // create map to value
    const classToMeasure: Map<string, number> = new Map<string, number>();
    for (let i = 0; i < classPerformanceData.x.length; i++) {
      classToMeasure.set(classPerformanceData.x[i], classPerformanceData.y[i]);
    }
    const accValues: number[] = y.map(x_v => classToMeasure.get(x_v) ?? 0);    // color based on balanced accuracy
    const barColors: string[] = accValues.map(v => this.getColorForValue(v));
    // transform data
    let data = [{
      x: x,
      y: y,
      text: accValues.map(v => "Balanced accuracy: " + v.toString()),
      type: "bar",
      name: "type",
      orientation: "h",
      marker: {
        color: barColors
      }
    }];

    // add subtype traces
    if (this.predictSubtypes) {
      const subtypeTraces: any[] = [...typeGroups.values()].map(sv => {
        return {
          x: sv.length,
          y: y,
          text: sv,
          name: "subtypes",
          orientation: "h"
        }
      });
      data.push(...subtypeTraces);
    }

    const layout = {
      paper_bgcolor: "white",
      autosize: true,
      barmode: "group",
      margin: {
        l: 250,
        r: 25,
        t: 50,
        b: 50
      },
      xaxis: {
        title: "Number of samples classified"
      }
    };
    const config = {
      responsive: true
    }
    return {data: data, layout: layout, config: config};
  }

  async plotPredictions(plotlyData: PlotlyData): Promise<void> {
    Plotly.newPlot(this.typePredictPiePlot.nativeElement, plotlyData.data, plotlyData.layout, plotlyData.config);
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

  showError(message: string) {
    // Implement your error display logic here, e.g., using a snackbar or modal
    alert(message); // Simple alert for demonstration
  }

  validateFileContent(file: File): boolean {
    // Perform basic validation, e.g., check file type and size
    // if (file.type !== this.acceptExpressionFiles()) {
    //   this.showError('Invalid file type. Please upload a text file.');
    //   return false;
    // }
    if (file.size > this.maxFileSize) {
      this.showError('File size exceeds the maximum limit.');
      return false;
    }
    // Additional content validation can be added here
    return true;
  }

  async getPredictionData(): Promise<any> {
    const uploadedFile: File = this.uploadedExpressionFiles[0];
    // Client-side validation
    if (!this.validateFileContent(uploadedFile)) {
      return Promise.reject('Client-side validation failed.');
    }
    // send file and parameters to API and return response
    try {
      const prediction = await this.backend.predictCancerType(
        this.versionService.versionReadOnly()(),
        uploadedFile, this.predictSubtypes, this.logScaling,
        this.formGroup.value.mscor ?? this.mscorDefault,
        this.formGroup.value.fdr ?? this.fdrDefault,
        this.formGroup.value.minSize ?? this.minSizeDefault,
        this.formGroup.value.maxSize ?? this.maxSizeDefault,
        this.formGroup.value.minExpr ?? this.minExprDefault,
        this.formGroup.value.method ?? this.methodDefault,
      )
      return prediction;
    } catch (error) {
      this.showError('Server-side validation failed. Please check the file content.');
      throw error;
    }
  }

  async predict() {
    this.predictionQueried = true;
    this.predictionLoading = true;
    // start timer of estimated run time
    this.startTimer().then(_ => this.timerRunning = false);
    // start workflow
    try {
      const data = await this.getPredictionData();
      await this.processPredictions(data);
    } catch (error) {
      console.error(error);
    } finally {
      this.predictionLoading = false;
    }
  }
}


