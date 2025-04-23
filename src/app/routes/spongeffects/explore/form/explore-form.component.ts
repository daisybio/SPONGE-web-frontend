import {Component, inject, Signal, linkedSignal, computed} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import { MatCheckboxModule } from '@angular/material/checkbox';
import {ExploreService} from "../service/explore.service";
import {MatCardModule} from "@angular/material/card";
import {capitalize} from "lodash";
import {Dataset} from "../../../../interfaces";
import { compute } from '@fullstax/kaplan-meier-estimator';
import {MatChipsModule} from '@angular/material/chips';

@Component({
  selector: 'app-explore-form',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './explore-form.component.html',
  styleUrl: './explore-form.component.scss'
})
export class ExploreFormComponent {
  exploreService = inject(ExploreService)
  level$ = this.exploreService.level$;
  diseases$ = this.exploreService.diseaseNames$;
  disease$ = this.exploreService.selectedDisease$;
  spongeEffectsRuns = this.exploreService.spongeEffectsRuns$;
  formGroup = this.exploreService.formGroup$;
  paramSets = this.exploreService.paramSets$;
  protected readonly capitalize = capitalize;
  highestKey = this.exploreService.highestKey;
}
