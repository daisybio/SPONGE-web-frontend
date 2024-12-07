import {Component, computed, effect, Signal} from '@angular/core';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {CeRNAQuery, Dataset, GeneSorting, InteractionSorting} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {VersionsService} from "../../../services/versions.service";

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
  diseases: Signal<Dataset[]>;
  geneSortings = GeneSorting;
  interactionSortings = InteractionSorting;
  formGroup = new FormGroup({
    disease: new FormControl<Dataset | undefined>(undefined, Validators.required),
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
    this.diseases = computed(() => (diseases.value() || []).sort((a, b) => a.disease_name.localeCompare(b.disease_name)));
    this.isLoading$ = this.browseService.isLoading$;

    effect(() => {
      this.formGroup.get('disease')?.setValue(this.diseases()?.[0]);
    })
  }

  onSubmit() {
    const config = this.formGroup.value as CeRNAQuery;
    this.browseService.runQuery(config);
  }

  capitalize(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  getKeys(enumType: any): string[] {
    return Object.values(enumType);
  }
}
