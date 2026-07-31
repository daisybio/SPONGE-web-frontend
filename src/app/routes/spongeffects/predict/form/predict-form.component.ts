import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDropzone } from '@ngx-dropzone/material';
import { FileInputDirective } from '@ngx-dropzone/cdk';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
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
import { capitalize } from "lodash";
import { ExploreFormComponent } from '../../explore/form/explore-form.component';
import { SpongEffectsService } from '../../../../services/spong-effects.service';
import { Dataset } from '../../../../interfaces';
import { MatCardModule } from '@angular/material/card';
import { sortDiseaseObjects } from '../../../../cancer-colors';

@Component({
  selector: 'app-predict-form',
  imports: [
    CommonModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    MatError,
    ReactiveFormsModule,
    FormsModule,
    MatExpansionModule,
    MatCheckbox,
    MatSelect,
    MatOption,
    NgIf,
    NgForOf,
    MatButtonModule,
    MatDropzone,
    FileInputDirective,
    MatTableModule,
    MatDividerModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    InfoComponent,
    MatCardModule,
  ],
  templateUrl: './predict-form.component.html',
  styleUrl: './predict-form.component.scss',
})
export class PredictFormComponent {
  infoService = inject(InfoService);
  predictService = inject(PredictService);
  versionService = inject(VersionsService);
  spongEffectsService = inject(SpongEffectsService);
  selectedPredictedType = this.predictService.selectedPredictedType$;
  allPredictedTypes$ = this.predictService.allPredictedTypes$;
  models$ = this.spongEffectsService.datasets$;
  sortedModels$ = computed(() => {
    return sortDiseaseObjects(this.models$() || []);
  });
  protected readonly capitalize = capitalize;

  // Real subtype names for the currently selected type, sourced from the full SPONGE dataset
  // catalog (not spongEffectsService.datasets$, which has no subtype-level entries yet — no
  // subtype-specific spongEffects models have been trained). Shown as a preview of what's
  // coming; not yet submittable since there's no backend model to run them against.
  private readonly selectedTypeName$ = toSignal(
    this.predictService.formGroup.get('model')!.valueChanges,
    { initialValue: this.predictService.formGroup.get('model')!.value },
  );
  subtypesForSelectedType$ = computed(() => {
    const typeName = this.selectedTypeName$();
    if (!typeName) return [];
    return (this.versionService.diseases$().value() || [])
      .filter((d: Dataset) => d.disease_name === typeName && !!d.disease_subtype);
  });
  // methods = ['gsva', 'ssgsea', 'OE'];
  methods = {
    gsva: 'GSVA',
    ssgsea: 'ssGSEA',
    OE: 'OE',
  }
  formGroup = this.predictService.formGroup;
  fileCtrl = this.predictService.fileCtrl;
  fileCtrlValue$ = toSignal(this.fileCtrl.valueChanges, { initialValue: this.fileCtrl.value });
  dialog = inject(MatDialog);

  isLoading$ = this.predictService.isLoading$;
  query$ = toSignal(this.formGroup.valueChanges, { initialValue: this.formGroup.getRawValue() });
  useExampleExpression$ = computed(
    () => this.query$()?.useExampleExpression || false,
  );

  subtype_effect = effect(() => {
    if (this.query$()?.predictSubtypes) {
      this.predictService._subtypes$.set(true)
    } else {
      this.predictService._subtypes$.set(false)
    }
  });

  // model_effect = effect(() => {
  //   const models = this.models$();
  //   if (models.length > 0 && !this.formGroup.get('model')?.value) {
  //     this.formGroup.patchValue({ model: models[0].disease_name });
  //   }
  // });

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
      model: query.model!,
    });
  }

  async showExpressionFile(file: File) {
    this.dialog.open(ExampleFileModalComponent, {
      data: file,
      height: '410px',
      width: '600px',
    });
  }

  /** Preview the example dataset (used by the "example data" badge). */
  async showExampleData() {
    this.showExpressionFile(await this.exampleDataFile);
  }

  downloadResults() {
    const prediction = this.predictService.prediction$();
    if (!prediction) {
      console.warn('No prediction available to download');
      return;
    }
    // download prediction results as JSON file
    const fileName = `prediction_results_${new Date().toISOString()}.json`;
    const blob = new Blob([JSON.stringify(prediction, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
