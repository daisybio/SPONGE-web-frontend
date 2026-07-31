import { Component, inject, input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatDividerModule } from "@angular/material/divider";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ExploreService } from "../service/explore.service";
import { MatCardModule } from "@angular/material/card";
import { capitalize } from "lodash";
import { MatChipsModule } from '@angular/material/chips';
import { BrowseService } from "../../../../services/browse.service";
import { MatInputModule } from "@angular/material/input";
import { MatExpansionModule } from "@angular/material/expansion";
import { getDiseaseDisplayName } from '../../../../cancer-colors';
import { SUBTYPE_DEFAULT } from '../../../../constants';
import { InfoComponent } from '../../../../components/info/info.component';

@Component({
  selector: 'app-explore-form',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule,
    MatInputModule,
    MatExpansionModule,
    InfoComponent,
  ],
  templateUrl: './explore-form.component.html',
  styleUrl: './explore-form.component.scss'
})
export class ExploreFormComponent {
  exploreService = inject(ExploreService)
  level$ = this.exploreService.level$;
  diseases$ = this.exploreService.diseaseNames$;
  diseaseSampleCounts$ = this.exploreService.diseaseSampleCounts$;
  disease$ = this.exploreService.selectedDisease$;
  selectedSubtype$ = this.exploreService.selectedSubtype$;
  availableSubtypes = this.exploreService.availableSubtypes$;
  spongeEffectsRuns = this.exploreService.spongeEffectsRuns$;
  paramSets = this.exploreService.paramSets$;
  protected readonly capitalize = capitalize;
  protected readonly getDiseaseDisplayName = getDiseaseDisplayName;
  protected readonly SUBTYPE_DEFAULT = SUBTYPE_DEFAULT;
  highestKey = this.exploreService.highestKey;

  isParamSetSelected(index: number): boolean {
    return this.exploreService.isParamSetIndexSelected(index);
  }

  toggleParamSet(index: number): void {
    this.exploreService.toggleParamSetIndex(index);
  }
}
