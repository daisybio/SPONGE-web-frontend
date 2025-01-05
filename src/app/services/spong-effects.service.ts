import {computed, inject, Injectable, resource, linkedSignal} from '@angular/core';
import {BackendService} from "./backend.service";
import {VersionsService} from "./versions.service";
import {SpongEffectsRun, Dataset} from "../interfaces";
import { Data } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SpongEffectsService {
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
  datasets$ = computed(() => {
    const runs = this.spongEffectsRuns$.value() || [];
    const datasets = runs.map((run: SpongEffectsRun) => ({
      dataset_ID: run.dataset_ID,
      disease_name: run.disease_name,
      data_origin: run.data_origin,
      disease_subtype: run.disease_subtype,
      disease_type: run.disease_type,
      download_url: run.download_url,
      sponge_db_version: run.sponge_db_version,
    } as Dataset));
    return datasets.filter((dataset, index, self) =>
      index === self.findIndex((d) => d.dataset_ID === dataset.dataset_ID)
    );
  });
  // diseaseNames$ = linkedSignal(() => this.datasets$().map(d => d.disease_name));
  diseaseNames$ = computed(() => {
    const runs = this.spongEffectsRuns$.value() || [];
    return runs.map((run: SpongEffectsRun) => run.disease_name)
      .filter((value: string, index: number, self: Array<string>) => self.indexOf(value) === index);
  });
  private readonly _version$ = this.versionsService.versionReadOnly();
  spongEffectsRuns$ = resource({
    request: this._version$,
    loader: async (version) => (
      await this.backend.getSpongEffectsRuns(version.request)
    )
  });
}
