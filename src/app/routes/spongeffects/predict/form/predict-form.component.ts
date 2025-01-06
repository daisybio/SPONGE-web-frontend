import {Component, computed, ElementRef, HostListener, inject, viewChild, ViewChild} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatError, MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatOption} from "@angular/material/core";
import {MatSelect} from "@angular/material/select";
import {CommonModule, NgForOf} from "@angular/common";
import {MatAnchor, MatButton} from "@angular/material/button";
import {MatDropzone} from "@ngx-dropzone/material";
import {FileInputDirective} from "@ngx-dropzone/cdk";
import {toSignal} from "@angular/core/rxjs-interop";
import { ExampleExpression } from '../../../../interfaces';
import { HttpClient } from '@angular/common/http'; 
import {firstValueFrom, lastValueFrom} from "rxjs";
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import * as Papa from 'papaparse';
import { HttpService } from '../../../../services/http.service';
import {MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import { BackendService } from '../../../../services/backend.service';
import {VersionsService} from '../../../../services/versions.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PredictionResultsComponent } from '../prediction-results/prediction-results.component';



@Component({
  selector: 'app-predict-form',
  imports: [
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    MatExpansionModule,
    MatCheckbox,
    MatOption,
    MatSelect,
    NgForOf,
    MatButton,
    FormsModule,
    MatAnchor,
    MatDropzone,
    FileInputDirective,
    CommonModule,
    MatOption,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './predict-form.component.html',
  styleUrl: './predict-form.component.scss'
})
export class PredictFormComponent {
  methods = ['gsva', 'ssgsea', 'OE']
  formGroup = new FormGroup({
    useExampleExpression: new FormControl<boolean>(false),
    mscor: new FormControl(0.1, [Validators.min(0), Validators.max(1)]),
    fdr: new FormControl(0.05, [Validators.min(0), Validators.max(1)]),
    minSize: new FormControl(100, [Validators.min(0)]),
    maxSize: new FormControl(2000, [Validators.min(0)]),
    minExpr: new FormControl(10, [Validators.min(0)]),
    method: new FormControl(this.methods[0]),
    logScaling: new FormControl<boolean>(true),
    predictSubtypes: new FormControl<boolean>(false),
  });
  backend = inject(BackendService);
  versionService = inject(VersionsService);
  httpService = inject(HttpService);
  http = inject(HttpClient);
  predictionLoading: boolean = false;


  tableContainer =  viewChild.required<ElementRef<HTMLDivElement>>('tableContainer');
  @ViewChild(PredictionResultsComponent) predictionResultsComponent!: PredictionResultsComponent;


  query$ = toSignal(this.formGroup.valueChanges);
  csvFilePath = 'https://exbio.wzw.tum.de/sponge-files/GSE123845_exp_tpm_matrix_processed.csv';
  useExampleExpression$ = computed(() => this.query$()?.useExampleExpression);
  showExpressionExample = false;
  predictionQueried: boolean = false;

  fileCtrl = new FormControl();

  clear() {
    this.fileCtrl.setValue(null);
  }

  ngOnInit() {
    this.loadCSV();
  }

  ngAfterViewInit() {
    this.tableContainer().nativeElement.addEventListener('scroll', this.onScroll.bind(this));
  }


  flipExampleExpression() {
    this.showExpressionExample = !this.showExpressionExample;
  }

  buttonText(btn: string) {
    if (btn == "expr") {
      return this.showExpressionExample ? "Hide example file" : "Show example file";
    } else {
      return 
    }
  }

  exampleExpressionData: MatTableDataSource<any> = new MatTableDataSource<ExampleExpression>();
  exampleData: ExampleExpression[] = [];
  exampleDataKeys: (keyof ExampleExpression)[] = [];
  allData: ExampleExpression[] = [];
  rowsToLoad = 10;


  loadCSV() {
    this.http.get(this.csvFilePath, { responseType: 'text' }).subscribe(
      (data) => {
        Papa.parse(data, {
          header: true,
          complete: (result) => {
            this.allData = result.data as ExampleExpression[];
            this.loadMoreData();
            if (this.exampleData.length > 0) {
              this.exampleDataKeys = Object.keys(this.exampleData[0]) as (keyof ExampleExpression)[];
            }
            console.log(this.exampleData);
          },
          error: (error: any) => {
            console.error('Error parsing CSV file:', error);
          }
        });
      },
      (error) => {
        console.error('Error loading CSV file:', error);
      }
    );
  }


  loadMoreData() {
    const currentLength = this.exampleData.length;
    const newData = this.allData.slice(currentLength, currentLength + this.rowsToLoad);
    this.exampleData = [...this.exampleData, ...newData];
    this.exampleExpressionData = new MatTableDataSource<any>(this.exampleData);
  }

  onScroll(event: Event) {
    console.log('scrolling')
    const element = event.target as HTMLElement; // Explicitly cast to HTMLElement
    console.log(element.scrollHeight)
    console.log(element.scrollTop)
    console.log(element.clientHeight)
    console.log(element.scrollHeight - element.scrollTop)
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 10) {
      this.loadMoreData();
    }
  }


  getValue(row: ExampleExpression, key: keyof ExampleExpression): any {
    return row[key];
  }

  async predict() {
    this.predictionQueried = true;
    this.predictionLoading = true;
    // start timer of estimated run time
    // this.startTimer().then(_ => this.timerRunning = false);
    // start workflow
    this.getPredictionData()
      // .then(data => this.processPredictions(data))
      .then(_ => this.predictionLoading = false);
  }

  async getPredictionData(): Promise<any> {
    let uploadedFile: Blob;
    if (this.formGroup.get('useExampleExpression')!.value === true) {
      // const exampleDataString = Papa.unparse(this.exampleData);
      // const blob = new Blob([exampleDataString], { type: 'text/csv' });
      // uploadedFile = new File([blob], 'GSE123845_exp_tpm_matrix_processed.csv', { type: 'text/csv', lastModified: new Date().getTime() });
      const response = await fetch(this.csvFilePath);
      const blob = await response.blob();
      uploadedFile = new File([blob], 'GSE123845_exp_tpm_matrix_processed.csv', { type: 'text/csv', lastModified: new Date().getTime() });
      } else {
      uploadedFile = this.fileCtrl.value;
    }
    console.log(uploadedFile);
    // send file and parameters to API and return response
    if (this.formGroup.value.predictSubtypes === undefined || this.formGroup.value.logScaling === undefined || this.formGroup.value.mscor === undefined || this.formGroup.value.fdr === undefined || this.formGroup.value.minSize === undefined || this.formGroup.value.maxSize === undefined || this.formGroup.value.minExpr === undefined || this.formGroup.value.method === undefined) {
      return;
    }  
    const prediction = this.backend.predictCancerType(this.versionService.versionReadOnly()(), uploadedFile, this.formGroup.value.predictSubtypes!, 
      this.formGroup.value.logScaling!, this.formGroup.value.mscor!, this.formGroup.value.fdr!, this.formGroup.value.minSize!, 
      this.formGroup.value.maxSize!, this.formGroup.value.minExpr!, this.formGroup.value.method!);
  
    console.log(prediction);
    return prediction;
    }

  runButtonDisabled(): boolean {
      return !(this.formGroup.get('useExampleExpression')?.value || this.expressionUploaded()) || this.predictionLoading;
    }

  expressionUploaded(): boolean {
    return this.fileCtrl.value !== null;
  }


}
