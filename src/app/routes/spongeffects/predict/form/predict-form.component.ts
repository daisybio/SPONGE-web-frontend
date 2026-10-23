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
import { getDiseaseDisplayName, sortDiseaseObjects } from '../../../../cancer-colors';

// Network thresholds (m_scor_threshold / p_adj_threshold) of the spongEffects run each packaged
// model in models.RDS was built from. classify.R does not filter by them: they are fixed by the
// model, so the form only shows them. Identified 2026-10-22 by matching models.RDS train + test
// accuracy against SPONGEdb_v2/model_performances.tsv (module members agree with the DB run).
// Gene cervical/sarcoma/stomach come from a train:0.9 run that is not in the DB.
// See critical_project_info.md; update when models.RDS is replaced.
const MODEL_THRESHOLDS: Record<'gene' | 'transcript', Record<string, { mscor: number; fdr: number }>> = {
  gene: {
    'pancancer': { mscor: 0, fdr: 0.05 },                              // run 1
    'breast invasive carcinoma': { mscor: 0, fdr: 0.05 },              // run 3
    'brain lower grade glioma': { mscor: 0, fdr: 0.05 },               // run 15
    'cervical & endocervical cancer': { mscor: 0.1, fdr: 0.01 },       // not in DB (train 0.9)
    'esophageal carcinoma': { mscor: 0.1, fdr: 0.01 },                 // run 8
    'head & neck squamous cell carcinoma': { mscor: 0, fdr: 0.01 },    // run 13
    'sarcoma': { mscor: 0.1, fdr: 0.01 },                              // not in DB (train 0.9)
    'stomach adenocarcinoma': { mscor: 0.1, fdr: 0.01 },               // not in DB (train 0.9)
    'testicular germ cell tumor': { mscor: 0, fdr: 0.05 },             // run 24
  },
  transcript: {
    'pancancer': { mscor: 0, fdr: 0.05 },                              // run 74
    'breast invasive carcinoma': { mscor: 0, fdr: 0.05 },              // run 52
    'brain lower grade glioma': { mscor: 0, fdr: 0.05 },               // run 63
    'cervical & endocervical cancer': { mscor: 0, fdr: 0.01 },         // run 55
    'esophageal carcinoma': { mscor: 0, fdr: 0.05 },                   // run 57
    'head & neck squamous cell carcinoma': { mscor: 0, fdr: 0.05 },    // run 60
    'sarcoma': { mscor: 0, fdr: 0.05 },                                // run 66
    'stomach adenocarcinoma': { mscor: 0.1, fdr: 0.01 },               // run 68
    'testicular germ cell tumor': { mscor: 0, fdr: 0.05 },             // run 72
  },
};

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
  protected readonly getDiseaseDisplayName = getDiseaseDisplayName;

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

  // Feature level of the selected file (ENSG/ENST of the first data rows), for the model thresholds
  readonly expressionLevel$ = signal<'gene' | 'transcript' | undefined>(undefined);
  private readonly levelEffect = effect(() => {
    const filePromise = this.selectedExpressionFile$();
    this.expressionLevel$.set(undefined);
    filePromise.then(async (file) => {
      if (!file || filePromise !== this.selectedExpressionFile$()) return;
      const match = (await file.slice(0, 65536).text()).match(/ENS(G|T)\d/);
      if (filePromise !== this.selectedExpressionFile$()) return;
      this.expressionLevel$.set(match ? (match[1] === 'G' ? 'gene' : 'transcript') : undefined);
    });
  });

  readonly modelThresholds$ = computed(() => {
    const level = this.expressionLevel$();
    const model = this.selectedTypeName$();
    return level && model ? MODEL_THRESHOLDS[level][model] : undefined;
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
