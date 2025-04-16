import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SPONGE_EXAMPLE_URL } from '../../../../constants';
import { MatDialog } from '@angular/material/dialog';
import { ExampleFileModalComponent } from './example-file-modal/example-file-modal.component';
import { PredictService } from '../service/predict.service';
import { VersionsService } from '../../../../services/versions.service';
import { InfoComponent } from '../../../../components/info/info.component';
import { InfoService } from '../../../../services/info.service';

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
    InfoComponent
  ],
  templateUrl: './predict-form.component.html',
  styleUrl: './predict-form.component.scss',
})
export class PredictFormComponent {
  infoService = inject(InfoService);
  // methods = ['gsva', 'ssgsea', 'OE'];
  methods = {
    gsva: 'GSVA',
    ssgsea: 'ssGSEA',
    OE: 'OE',
  }
  formGroup = new FormGroup({
    useExampleExpression: new FormControl<boolean>(false, {nonNullable: true}),
    mscor: new FormControl<number>(0.1, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(1)],
    }),
    fdr: new FormControl(0.05, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(1)],
    }),
    minSize: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    maxSize: new FormControl(2000, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    minExpr: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    method: new FormControl(Object.keys(this.methods)[0], { nonNullable: true }),
    logScaling: new FormControl<boolean>(true, { nonNullable: true }),
    predictSubtypes: new FormControl<boolean>(false, { nonNullable: true }),
  });
  fileCtrl = new FormControl<File | null>(null);
  fileCtrlValue$ = toSignal(this.fileCtrl.valueChanges);
  dialog = inject(MatDialog);
  predictService = inject(PredictService);

  isLoading$ = this.predictService.isLoading$;
  query$ = toSignal(this.formGroup.valueChanges);
  useExampleExpression$ = computed(
    () => this.query$()?.useExampleExpression || false,
  );

  subtype_effect = effect(() => {
    console.log('subtype effect form');
    if (this.query$()?.predictSubtypes) {
      this.predictService._subtypes$.set(true)
    } else {
      this.predictService._subtypes$.set(false)
    }
  });

  versionService = inject(VersionsService);

  exampleDataFile = (async () => {
    const response = await fetch(SPONGE_EXAMPLE_URL);
    const blob = await response.blob();
    return new File([blob], 'example.csv', { type: 'text/csv' });
  })();

  selectedExpressionFile$ = computed(async () => {
    if (this.useExampleExpression$()) {
      return await this.exampleDataFile;
    } else {
      return this.fileCtrlValue$() || undefined;
    }
  });

  async predict() {
    const query = this.formGroup.getRawValue();
    this.predictService.request({
      file: (await this.selectedExpressionFile$()) as File,
      version: this.versionService.versionReadOnly()(),
      ...query,
    });
  }

  async showExpressionFile(file: File) {
    this.dialog.open(ExampleFileModalComponent, {
      data: file,
      height: '410px',
      width: '600px',
    });
  }
}
