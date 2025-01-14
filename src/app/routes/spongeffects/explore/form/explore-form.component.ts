import {Component, inject, Signal, linkedSignal} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {ExploreService} from "../service/explore.service";
import {capitalize} from "lodash";
import {Dataset} from "../../../../interfaces";

@Component({
  selector: 'app-explore-form',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonToggleModule
  ],
  templateUrl: './explore-form.component.html',
  styleUrl: './explore-form.component.scss'
})
export class ExploreFormComponent {
  exploreService = inject(ExploreService)
  level$ = this.exploreService.level$;
  diseases$ = this.exploreService.diseaseNames$;
  disease$ = this.exploreService.selectedDisease$;
  protected readonly capitalize = capitalize;
}
