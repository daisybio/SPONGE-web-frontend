import {Component, computed, inject, linkedSignal, Signal} from '@angular/core';
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
  localDisease$ = linkedSignal(() => this.possibleSubtypes$()[0]);

  protected readonly capitalize = capitalize;
  protected readonly SUBTYPE_DEFAULT = SUBTYPE_DEFAULT;
}
