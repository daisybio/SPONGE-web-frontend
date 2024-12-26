import {Component, computed, inject, linkedSignal, resource, signal, WritableSignal} from '@angular/core';
import {VersionsService} from "../../../services/versions.service";
import {BrowseService} from "../../../services/browse.service";
import {BackendService} from "../../../services/backend.service";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {Comparison, Dataset} from "../../../interfaces";
import {DiseaseSelectorComponent} from "../../../components/disease-selector/disease-selector.component";
import {MatCardModule} from "@angular/material/card";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {capitalize} from "lodash";
import {KeyValuePipe} from "@angular/common";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {GSEAresultsComponent} from "./gsearesults/gsearesults.component";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatGridListModule} from "@angular/material/grid-list";

@Component({
  selector: 'app-gsea',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    DiseaseSelectorComponent,
    MatCardModule,
    MatButtonToggleGroup,
    MatButtonToggle,
    KeyValuePipe,
    MatProgressSpinner,
    GSEAresultsComponent,
    MatExpansionModule,
    MatGridListModule
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
  possibleGlobalConditions$ = computed(() => this.getConditionsForDisease(this.possibleComparisons$(), this.globalDisease$()))
  activeGlobalCondition$ = linkedSignal(() => this.possibleGlobalConditions$()[0])
  conditionComparisons$ = computed(() => {
    const globalDisease = this.globalDisease$();
    if (globalDisease === undefined) return [];
    const globalCondition = this.activeGlobalCondition$();

    return this.possibleComparisons$()
      .filter(c => ((c.dataset_1.dataset_ID === globalDisease.dataset_ID)
          && (c.condition_1 === globalCondition))
        || ((c.dataset_2.dataset_ID === globalDisease.dataset_ID)
          && (c.condition_2 === globalCondition)))
  })
  possibleLocalDiseases$ = computed(() => {
    const globalDisease = this.globalDisease$();
    if (globalDisease === undefined) return [];
    return this.conditionComparisons$()
      .map(c => c.dataset_1.dataset_ID === globalDisease.dataset_ID ? c.dataset_2 : c.dataset_1)
      .filter((v, i, a) => a.findIndex(ds => ds.dataset_ID === v.dataset_ID) === i);
  })
  allowedLocalConditions$ = computed(() => {
    const globalDisease = this.globalDisease$();
    const localDisease = this.localDisease$();
    const res = this.getConditionsForDisease(this.conditionComparisons$(), localDisease);
    if (globalDisease?.dataset_ID === localDisease?.dataset_ID) {
      const globalCondition = this.activeGlobalCondition$();
      return res.filter(c => c != globalCondition)
    }
    return res
  })
  localConditions$ = computed(() => {
    const existingLocalConditions = this.getConditionsForDisease(this.possibleComparisons$(), this.localDisease$());
    const allowedLocalConditions = this.allowedLocalConditions$();

    return existingLocalConditions.reduce((acc, c: string) => {
      acc[c] = allowedLocalConditions.some(condition => condition == c)
      return acc;
    }, {} as { [key: string]: boolean })
  })
  activeLocalCondition$ = linkedSignal(() => this.allowedLocalConditions$()[0])
  geneSets$ = resource({
    request: computed(() => {
      return {
        global: this.globalDisease$(),
        local: this.localDisease$(),
        version: this.versionsService.versionReadOnly()(),
        globalCondition: this.activeGlobalCondition$(),
        localCondition: this.activeLocalCondition$()
      }
    }),
    loader: request => {
      return this.backend.getGeneSets(request.request.version, request.request.global, request.request.globalCondition, request.request.local, request.request.localCondition);
    }
  })
  activeGeneSet$: WritableSignal<string | undefined> = linkedSignal(() => {
    const geneSets = this.geneSets$.value();
    return geneSets ? geneSets[0] : undefined;
  });
  activeComparison$ = computed(() => {
    const localDisease = this.localDisease$();
    const localCondition = this.activeLocalCondition$();

    if (localDisease === undefined) return undefined;

    return this.conditionComparisons$().find(c => ((c.dataset_1.dataset_ID === localDisease.dataset_ID)
        && (c.condition_1 === localCondition))
      || ((c.dataset_2.dataset_ID === localDisease.dataset_ID)
        && (c.condition_2 === localCondition)))
  })

  gseaResults$ = resource({
    request: computed(() => {
      return {
        global: this.globalDisease$(),
        local: this.localDisease$(),
        version: this.versionsService.versionReadOnly()(),
        globalCondition: this.activeGlobalCondition$(),
        localCondition: this.activeLocalCondition$(),
        geneSet: this.activeGeneSet$()
      }
    }),
    loader: params => {
      return this.backend.getGSEAresults(
        params.request.version,
        params.request.global,
        params.request.globalCondition,
        params.request.local,
        params.request.localCondition,
        params.request.geneSet)
    }
  })

  protected readonly capitalize = capitalize;

  private getConditionsForDisease(comparisons: Comparison[], disease: Dataset | undefined) {
    if (disease === undefined) return [];

    return comparisons.flatMap(c => {
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
