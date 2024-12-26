import {Component, computed, inject, resource, signal} from '@angular/core';
import {VersionsService} from "../../../services/versions.service";
import {BrowseService} from "../../../services/browse.service";
import {BackendService} from "../../../services/backend.service";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {Dataset} from "../../../interfaces";
import {DiseaseSelectorComponent} from "../../../components/disease-selector/disease-selector.component";
import {MatCardModule} from "@angular/material/card";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {capitalize} from "lodash";

@Component({
  selector: 'app-gsea',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    DiseaseSelectorComponent,
    MatCardModule,
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: './gsea.component.html',
  styleUrl: './gsea.component.scss'
})
export class GSEAComponent {
  versionsService = inject(VersionsService);
  browseService = inject(BrowseService);
  backend = inject(BackendService);

  possibleComparisons$ = this.browseService.possibleComparisons$;
  globalDisease$ = this.browseService.disease$;
  localDisease$ = signal<Dataset | undefined>(undefined);
  possibleLocalDiseases$ = computed(() => {
    const globalDisease = this.globalDisease$();
    if (globalDisease === undefined) return [];
    const possibleComparisons = this.possibleComparisons$();
    return possibleComparisons.map(c => c.dataset_1.dataset_ID === globalDisease.dataset_ID ? c.dataset_2 : c.dataset_1)
      .filter((v, i, a) => a.findIndex(ds => ds.dataset_ID === v.dataset_ID) === i);
  })
  possibleGlobalConditions$ = computed(() => this.getConditionsForDisease(this.globalDisease$()))
  existingLocalConditions$ = computed(() => this.getConditionsForDisease(this.localDisease$()))

  geneSets$ = resource({
    request: computed(() => {
      return {
        global: this.globalDisease$(),
        local: this.localDisease$(),
        version: this.versionsService.versionReadOnly()()
      }
    }),
    loader: request => {
      return this.backend.getGeneSets(request.request.version, request.request.global, request.request.local);
    }
  })
  protected readonly capitalize = capitalize;

  private getConditionsForDisease(disease: Dataset | undefined) {
    if (disease === undefined) return [];

    return this.possibleComparisons$().flatMap(c => {
      const conditions = [];
      if (c.dataset_1.dataset_ID == disease.dataset_ID) {
        conditions.push(c.condition_1)
      }
      if (c.dataset_2.dataset_ID == disease.dataset_ID) {
        conditions.push(c.condition_2)
      }
      return conditions;
    }).filter((v, i, a) => a.indexOf(v) === i).sort();

  }
}
