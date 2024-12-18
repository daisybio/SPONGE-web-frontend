import {Component, computed, effect, inject, linkedSignal, resource, Signal} from '@angular/core';
import {VersionsService} from "../../../services/versions.service";
import {BrowseService} from "../../../services/browse.service";
import {BackendService} from "../../../services/backend.service";
import {Dataset} from "../../../interfaces";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {capitalize} from "lodash";
import {SUBTYPE_DEFAULT} from "../../../constants";

@Component({
  selector: 'app-gsea',
  imports: [
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './gsea.component.html',
  styleUrl: './gsea.component.scss'
})
export class GSEAComponent {
  versionsService = inject(VersionsService);
  browseService = inject(BrowseService);
  backend = inject(BackendService);

  diseaseSubtypeMap$ = this.versionsService.diseaseSubtypeMap();
  diseaseNames$ = computed(() => Array.from(this.diseaseSubtypeMap$().keys()).sort());
  globalDisease$ = this.browseService.disease$;

  localDiseaseName$ = linkedSignal(() => this.diseaseNames$()[0]);

  possibleSubtypes$: Signal<Dataset[]> = computed(() => {
    const diseaseName = this.localDiseaseName$();
    if (!diseaseName) return [];
    return this.diseaseSubtypeMap$().get(diseaseName) || [];
  });
  localDisease$ = linkedSignal(() => this.possibleSubtypes$().find(dataset => !dataset.disease_subtype) ?? this.possibleSubtypes$()[0]);
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
  protected readonly SUBTYPE_DEFAULT = SUBTYPE_DEFAULT;

  constructor() {
    effect(() => {
      console.log(this.geneSets$.value());
    });
  }
}
