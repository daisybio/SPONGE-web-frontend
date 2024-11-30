import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { SpongeEffectsComponent } from './spo';
import { RouterModule } from '@angular/router';
import {sum} from "simple-statistics";

@NgModule({
  declarations: [
    SpongeEffectsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSidenavModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatGridListModule,
    MatTableModule,
    NgxDropzoneModule,
    RouterModule.forChild([
      { path: '', component: SpongeEffectsComponent }
    ])
  ]
})
export class SpongeEffectsModule {

  export class Cancer {
  value: string;
  viewValue: string;
  allSubTypes: string[];
  sampleSizes: number[];

  base: string = "https://portal.gdc.cancer.gov/projects/TGCA-";

  constructor(value: string, viewValue: string, allSubTypes: string[], sampleSizes: number[], ) {
    this.value = value;
    this.viewValue = viewValue;
    this.allSubTypes = allSubTypes;
    this.sampleSizes = sampleSizes;
  }

  addSubtype(subtype: string) {
    this.allSubTypes.push(subtype);
  }

  addSampleSize(sampleSize: number) {
    if (sampleSize != null) this.sampleSizes.push(sampleSize);
  }

  totalNumberOfSamples() {
    return sum(this.sampleSizes.filter(s => s >= 0));
  }

  toString() {
    return this.viewValue + " - (" + this.value + ")";
  }

  getUrl() {
    return this.base + this.value
  }
}





}
