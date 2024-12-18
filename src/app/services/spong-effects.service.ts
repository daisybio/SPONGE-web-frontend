import {computed, inject, Injectable, resource} from '@angular/core';
import {BackendService} from "./backend.service";
import {VersionsService} from "./versions.service";
import {SpongEffectsRun} from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class SpongEffectsService {
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
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
