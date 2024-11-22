import {Component, Signal} from '@angular/core';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {BackendService} from "../../../services/backend.service";
import {Dataset, GeneSorting, InteractionSorting} from "../../../interfaces";
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
    disease: new FormControl(),
    geneSorting: new FormControl(this.geneSortings.Betweenness),
    maxGenes: new FormControl(10, [Validators.min(1), Validators.max(100)]),
    minDegree: new FormControl(1, [Validators.min(1), Validators.max(100)]),
    minBetweenness: new FormControl(0, [Validators.min(0), Validators.max(1)]),
    minEigen: new FormControl(0, [Validators.min(0), Validators.max(1)]),
    interactionSorting: new FormControl(this.interactionSortings.pAdj),
    maxInteractions: new FormControl(100, [Validators.min(1), Validators.max(1000)]),
    maxPValue: new FormControl(0.05, [Validators.min(0), Validators.max(1)]),
    minMScore: new FormControl(0, [Validators.min(0), Validators.max(1)]),
  })

  constructor(private backend: BackendService, private browseService: BrowseService) {
    this.diseases = this.backend.getDatasets().then(diseases => diseases.sort((a, b) => a.disease_name.localeCompare(b.disease_name)));
    this.diseases.then(diseases => this.formGroup.get('disease')?.setValue(diseases[0]));
    this.isLoading$ = this.browseService.isLoading$;
  }

  onSubmit() {
    const config = this.formGroup.value;
    this.browseService.runQuery(config);
  }

  capitalize(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  getKeys(enumType: any): string[] {
    return Object.values(enumType);
  }
}
