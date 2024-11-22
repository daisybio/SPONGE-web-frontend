import {Component} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatTabsModule} from "@angular/material/tabs";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatOption, MatSelect} from "@angular/material/select";
import {MatInput} from "@angular/material/input";
import {MatAccordion, MatExpansionModule} from "@angular/material/expansion";
import {MatButton} from "@angular/material/button";

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
    MatButton
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent {
  diseases = ["A", "B", "C"];
  geneSortings = ["D", "E", "F"];
  interactionSortings = ["G", "H", "I"];

  formGroup = new FormGroup({
    disease: new FormControl(this.diseases[0]),
    geneSorting: new FormControl(this.geneSortings[0]),
    maxGenes: new FormControl(10, [Validators.min(1), Validators.max(100)]),
    minDegree: new FormControl(1, [Validators.min(1), Validators.max(100)]),
    minBetweenness: new FormControl(0, [Validators.min(0), Validators.max(1)]),
    minEigen: new FormControl(0, [Validators.min(0), Validators.max(1)]),
    interactionSorting: new FormControl(this.interactionSortings[0]),
    maxInteractions: new FormControl(100, [Validators.min(1), Validators.max(1000)]),
    maxPValue: new FormControl(0.05, [Validators.min(0), Validators.max(1)]),
    minMScore: new FormControl(0, [Validators.min(0), Validators.max(1)]),
  })

  onSubmit() {
    console.log(this.formGroup.value);
  }
}
