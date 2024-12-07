import {Component, computed, effect, Signal} from '@angular/core';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {CeRNAQuery, Dataset, GeneSorting, InteractionSorting} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {VersionsService} from "../../../services/versions.service";
import {toSignal} from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-form',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatButton,
    MatInputModule,
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent {
  isLoading$: Signal<boolean>;
  diseases: Signal<string[]>;
  diseaseSubtypeMap: Signal<Map<string, Dataset[]>>;
  subtypes: Signal<Dataset[]>;
  geneSortings = GeneSorting;
  interactionSortings = InteractionSorting;
  formGroup = new FormGroup({
    disease: new FormControl<string>(''),
    dataset: new FormControl<Dataset | undefined>(undefined),
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

  constructor(versions: VersionsService, private browseService: BrowseService) {
    const diseases = versions.diseases$();
    this.diseaseSubtypeMap = computed(() => {
      const diseaseSubtypes = new Map<string, Dataset[]>();
      (diseases.value() || []).forEach(disease => {
        const diseaseName = disease.disease_name;
        if (!diseaseSubtypes.has(diseaseName)) {
          diseaseSubtypes.set(diseaseName, []);
        }
        diseaseSubtypes.get(diseaseName)?.push(disease);
      });
      return diseaseSubtypes;
    });
    this.diseases = computed(() => Array.from(this.diseaseSubtypeMap().keys()).sort((a, b) => a.localeCompare(b)));
    this.isLoading$ = this.browseService.isLoading$;

    const diseaseSignal = toSignal(
      this.formGroup.get('disease')!.valueChanges
    )

    this.subtypes = computed(() => {
      const disease = diseaseSignal();
      if (!disease) {
        return [];
      }
      return this.diseaseSubtypeMap().get(disease) || [];
    });

    effect(() => {
      const diseases = this.diseases();
      this.formGroup.get('disease')?.setValue(diseases[0]);
    })

    effect(() => {
      const subtypes = this.subtypes();
      const formField = this.formGroup.get('dataset');
      formField?.setValue(subtypes[0]);

      if (subtypes.length <= 1) {
        formField?.disable();
      } else {
        formField?.enable();
      }
    })

    this.formGroup.valueChanges.subscribe((config) => {
      config.dataset = this.formGroup.get('dataset')?.value as Dataset;
      this.browseService.runQuery(config as CeRNAQuery);
    })
  }

  capitalize(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  getKeys(enumType: any): string[] {
    return Object.values(enumType);
  }
}
