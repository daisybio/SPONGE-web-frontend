import {Component} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatTabsModule} from "@angular/material/tabs";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatOption, MatSelect} from "@angular/material/select";
import {MatInput} from "@angular/material/input";
import {MatAccordion, MatExpansionModule} from "@angular/material/expansion";
import {MatButton} from "@angular/material/button";
import {BackendService} from "../../services/backend.service";
import {Dataset, GeneSorting, InteractionSorting} from "../../interfaces";
import {AsyncPipe} from "@angular/common";

@Component({
  selector: 'app-browse',
  imports: [
    MatSidenavModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatInput,
    MatAccordion,
    MatExpansionModule,
    MatButton,
    AsyncPipe
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent {
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

  constructor(private backend: BackendService) {
    this.diseases = this.backend.getDatasets().then(diseases => diseases.sort((a, b) => a.disease_name.localeCompare(b.disease_name)));
    this.diseases.then(diseases => this.formGroup.get('disease')?.setValue(diseases[0]));
  }

  onSubmit() {
    console.log(this.formGroup.value);
  }

  capitalize(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  getKeys(enumType: any): string[] {
    return Object.values(enumType);
  }
}
