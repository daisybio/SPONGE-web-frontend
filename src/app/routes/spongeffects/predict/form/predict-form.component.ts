import {Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatError, MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatOption} from "@angular/material/core";
import {MatSelect} from "@angular/material/select";
import {NgForOf} from "@angular/common";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-predict-form',
  imports: [
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    MatExpansionModule,
    MatCheckbox,
    MatOption,
    MatSelect,
    NgForOf,
    MatButton
  ],
  templateUrl: './predict-form.component.html',
  styleUrl: './predict-form.component.scss'
})
export class PredictFormComponent {
  methods = ['gsva', 'ssgsea', 'OE']
  formGroup = new FormGroup({
    mscor: new FormControl(0.1, [Validators.min(0), Validators.max(1)]),
    fdr: new FormControl(0.05, [Validators.min(0), Validators.max(1)]),
    minSize: new FormControl(100, [Validators.min(0)]),
    maxSize: new FormControl(2000, [Validators.min(0)]),
    minExpr: new FormControl(10, [Validators.min(0)]),
    method: new FormControl(this.methods[0]),
    logScaling: new FormControl<boolean>(true),
    predictSubtypes: new FormControl<boolean>(false),
  });
}
