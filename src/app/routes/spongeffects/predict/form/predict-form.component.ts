import { Component, computed, inject, Signal, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { CommonModule, NgForOf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatDropzone } from '@ngx-dropzone/material';
import { FileInputDirective } from '@ngx-dropzone/cdk';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExampleExpression, PredictCancerType } from '../../../../interfaces';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { BackendService } from '../../../../services/backend.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PredictionResultsComponent } from '../prediction-results/prediction-results.component';
import { SPONGE_EXAMPLE_URL } from '../../../../constants';
import { MatDialog } from '@angular/material/dialog';
import { ExampleFileModalComponent } from './example-file-modal/example-file-modal.component';

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
    MatDropzone,
    FileInputDirective,
    CommonModule,
    MatOption,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './predict-form.component.html',
  styleUrl: './predict-form.component.scss',
})
export class PredictFormComponent {
  methods = ['gsva', 'ssgsea', 'OE'];
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
  fileCtrl = new FormControl<File | null>(null);
  fileCtrlValue$ = toSignal(this.fileCtrl.valueChanges);
  backend = inject(BackendService);
  dialog = inject(MatDialog);

  predictionLoading: boolean = false;
  @ViewChild(PredictionResultsComponent)
  predictionResultsComponent!: PredictionResultsComponent;
  query$ = toSignal(this.formGroup.valueChanges);
  useExampleExpression$ = computed(
    () => this.query$()?.useExampleExpression || false,
  );
  showExpressionExample = false;
  prediction: Signal<PredictCancerType> | undefined;
  exampleExpressionData: MatTableDataSource<any> =
    new MatTableDataSource<ExampleExpression>();
  exampleData: ExampleExpression[] = [];
  exampleDataKeys: (keyof ExampleExpression)[] = [];

  exampleDataFile = async () => {
    const response = await fetch(SPONGE_EXAMPLE_URL);
    const blob = await response.blob();
    return new File([blob], 'example.csv', { type: 'text/csv' });
  };

  selectedExpressionFile$ = computed(async () => {
    if (this.useExampleExpression$()) {
      return await this.exampleDataFile();
    } else {
      return this.fileCtrlValue$() || undefined;
    }
  });

  getValue(row: ExampleExpression, key: keyof ExampleExpression): any {
    return row[key];
  }

  /*
    async predict() {
      this.predictionQueried = true;
      this.predictionLoading = true;
      // start timer of estimated run time
      // this.startTimer().then(_ => this.timerRunning = false);
      // start workflow
      const prediction = await this.getPredictionData();
      this.prediction = signal(prediction);

      // .then(data => this.processPredictions(data))
      this.predictionLoading = false;
      console.log(this.prediction);
    }


    async getPredictionData(): Promise<PredictCancerType> {
      let uploadedFile: Blob;
      if (this.formGroup.get('useExampleExpression')!.value === true) {
        // const exampleDataString = Papa.unparse(this.exampleData);
        // const blob = new Blob([exampleDataString], { type: 'text/csv' });
        // uploadedFile = new File([blob], 'GSE123845_exp_tpm_matrix_processed.csv', { type: 'text/csv', lastModified: new Date().getTime() });
        const response = await fetch(this.csvFilePath);
        const blob = await response.blob();
        uploadedFile = new File(
          [blob],
          'GSE123845_exp_tpm_matrix_processed.csv',
          {
            type: 'text/csv',
            lastModified: new Date().getTime(),
          },
        );
      } else {
        uploadedFile = this.fileCtrl.value;
      }
      console.log(uploadedFile);
      // send file and parameters to API and return response
      if (
        this.formGroup.value.predictSubtypes === undefined ||
        this.formGroup.value.logScaling === undefined ||
        this.formGroup.value.mscor === undefined ||
        this.formGroup.value.fdr === undefined ||
        this.formGroup.value.minSize === undefined ||
        this.formGroup.value.maxSize === undefined ||
        this.formGroup.value.minExpr === undefined ||
        this.formGroup.value.method === undefined
      ) {
        return {
          meta: {
            runtime: 0,
            level: '',
            n_samples: 0,
            type_predict: '',
            subtype_predict: '',
          },
          data: [],
        };
      }
      const prediction = this.backend.predictCancerType(
        this.versionService.versionReadOnly()(),
        uploadedFile,
        this.formGroup.value.predictSubtypes!,
        this.formGroup.value.logScaling!,
        this.formGroup.value.mscor!,
        this.formGroup.value.fdr!,
        this.formGroup.value.minSize!,
        this.formGroup.value.maxSize!,
        this.formGroup.value.minExpr!,
        this.formGroup.value.method!,
      );

      console.log(prediction);
      return prediction;
    }
     */

  runButtonDisabled(): boolean {
    return (
      !(
        this.formGroup.get('useExampleExpression')?.value ||
        this.expressionUploaded()
      ) || this.predictionLoading
    );
  }

  expressionUploaded(): boolean {
    return this.fileCtrl.value !== null;
  }

  async showExpressionFile(file: File) {
    this.dialog.open(ExampleFileModalComponent, {
      data: file,
    });
  }
}
