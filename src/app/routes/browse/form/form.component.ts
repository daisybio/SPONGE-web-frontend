import {Component, computed, effect, inject} from '@angular/core';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import {BrowseQuery, Dataset, GeneSorting, InteractionSorting} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {VersionsService} from "../../../services/versions.service";
import {toSignal} from "@angular/core/rxjs-interop";
import _ from "lodash";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {SUBTYPE_DEFAULT} from "../../../constants";

@Component({
  selector: 'app-form',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonToggleGroup,
    MatButtonToggle,
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent {
  versionsService = inject(VersionsService);
  browseService = inject(BrowseService);
  version = this.versionsService.versionReadOnly();
  diseaseSubtypeMap = this.versionsService.diseaseSubtypeMap();
  diseases = computed(() => Array.from(this.diseaseSubtypeMap().keys()).sort((a, b) => a.localeCompare(b)));
  geneSortings = GeneSorting;
  interactionSortings = InteractionSorting;
  formGroup = new FormGroup({
    disease: new FormControl<string>(''),
    dataset: new FormControl<Dataset | undefined>(undefined),
    level: new FormControl<'gene' | 'transcript'>('gene'),
    geneSorting: new FormControl<GeneSorting>(this.geneSortings.Betweenness),
    maxGenes: new FormControl<number>(10),
    minDegree: new FormControl<number>(1),
    minBetweenness: new FormControl<number>(0),
    minEigen: new FormControl<number>(0),
    interactionSorting: new FormControl<InteractionSorting>(this.interactionSortings.pAdj),
    maxInteractions: new FormControl<number>(100),
    maxPValue: new FormControl<number>(0.05),
    minMScore: new FormControl<number>(0),
  })

  diseaseSignal = toSignal(
    this.formGroup.get('disease')!.valueChanges
  )

  subtypes = computed(() => {
    const disease = this.diseaseSignal();
    if (!disease) {
      return [];
    }
    return this.diseaseSubtypeMap().get(disease)?.sort((a, b) => a.disease_subtype?.localeCompare(b.disease_subtype || '') || 0) || [];
  });
  setInitialDisease = effect(() => {
    const diseases = this.diseases();
    this.formGroup.get('disease')?.setValue(diseases[0]);
  })
  setInitialSubtype = effect(() => {
    const subtypes = this.subtypes();
    const formField = this.formGroup.get('dataset');
    formField?.setValue(subtypes.find((subtype) => subtype.disease_subtype === null));

    if (subtypes.length <= 1) {
      formField?.disable();
    } else {
      formField?.enable();
    }
  })
  protected readonly capitalize = _.capitalize;
  protected readonly SUBTYPE_DEFAULT = SUBTYPE_DEFAULT;

  constructor() {
    this.formGroup.valueChanges.subscribe((config) => {
      config.dataset = this.formGroup.get('dataset')?.value as Dataset;
      this.browseService.runQuery(config as BrowseQuery);
    })
  }

  getKeys(enumType: any): string[] {
    return Object.values(enumType);
  }
}
