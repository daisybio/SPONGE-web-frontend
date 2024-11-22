import {Component, Signal} from '@angular/core';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {BackendService} from "../../../services/backend.service";
import {CeRNAQuery, Dataset, GeneSorting, InteractionSorting} from "../../../interfaces";
import {AsyncPipe} from "@angular/common";
import {BrowseService} from "../../../services/browse.service";

@Component({
  selector: 'app-form',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatButton,
    MatInputModule,
    AsyncPipe
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent {
  isLoading$: Signal<boolean>;
  diseases: Promise<Dataset[]>;
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

  constructor(private backend: BackendService, private browseService: BrowseService) {
    this.diseases = this.backend.getDatasets().then(diseases => diseases.sort((a, b) => a.disease_name.localeCompare(b.disease_name)));
    this.diseases.then(diseases => this.formGroup.get('disease')?.setValue(diseases[0]));
    this.isLoading$ = this.browseService.isLoading$;
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
