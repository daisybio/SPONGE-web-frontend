import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { SpongEffectsService } from '../../../../services/spong-effects.service';
import { Dataset } from '../../../../interfaces';
import { VersionsService } from '../../../../services/versions.service';
import { BackendService } from '../../../../services/backend.service';

@Injectable({
  providedIn: 'root',
})
export class ExploreService {
  versionsService = inject(VersionsService);
  backend = inject(BackendService);
  spongEffectsService = inject(SpongEffectsService);
  level$ = signal<'gene' | 'transcript'>('gene');
  diseaseNames$ = this.spongEffectsService.diseaseNames$;
  diseases$ = this.spongEffectsService.datasets$;
  selectedDisease$ = linkedSignal(() => this.diseaseNames$()[0]);
  selectedDiseaseObject$: WritableSignal<Dataset> = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    const datasets = this.diseases$();
    const selectedDataset = datasets.find(
      (d) => d.disease_name === selectedDisease,
    );
    if (!selectedDataset) {
      throw new Error(
        'Selected disease not found in datasets: ' + selectedDisease,
      );
    }
    return selectedDataset;
  });

  readonly runClassPerformance$ = resource({
    request: computed(() => {
      return {
        version: this.versionsService.versionReadOnly()(),
        cancer: this.selectedDisease$(),
        level: this.level$(),
      };
    }),
    loader: async (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      if (version === undefined || cancer === undefined || level === undefined)
        return [];
      return await this.backend.getRunClassPerformance(version, cancer, level);
    },
  });
}
