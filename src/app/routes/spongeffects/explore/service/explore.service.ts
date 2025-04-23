import {
  computed,
  effect,
  inject,
  Injectable,
  linkedSignal,
  resource,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { SpongEffectsService } from '../../../../services/spong-effects.service';
import { Dataset, RunClassPerformance } from '../../../../interfaces';
import { VersionsService } from '../../../../services/versions.service';
import { BackendService } from '../../../../services/backend.service';
import { FormControl, FormGroup } from '@angular/forms';

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
  highestKey: WritableSignal<string> = signal<string>('');

  // for each disease, there are multiple spongeffects runs. Filter spongEffectsService.SpongeffectsRuns$ to get the runs for the selected disease
  spongeEffectsRuns$ = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    let runs = this.spongEffectsService.spongEffectsRuns$.value() || [];
    runs = runs.filter((run) => run.disease_name === selectedDisease);
    // then filter
    return runs
  });



  // get the unique param sets (m_scor_threshold, p_adj_threshold, modules_cutoff)
  paramSets$ = computed(() => {
    const runs = this.spongeEffectsRuns$();
    const paramSets = runs.map((run) => ({
      m_scor_threshold: run.m_scor_threshold,
      p_adj_threshold: run.p_adj_threshold,
      modules_cutoff: run.modules_cutoff,
    }));
    // remove duplicates
    return paramSets.filter((paramSet, index, self) =>
      index === self.findIndex((d) => d.m_scor_threshold === paramSet.m_scor_threshold && d.p_adj_threshold === paramSet.p_adj_threshold && d.modules_cutoff === paramSet.modules_cutoff)
    );
  }
  );
  formGroup$ = computed(() => {
    const paramSets = this.paramSets$();
    const controls: { [key: string]: any } = {};
  
    // Create a FormControl for each paramSet
    paramSets.forEach((paramSet, index) => {
      const key = `paramSet_${index + 1}`; 
      controls[key] = new FormControl<boolean>(true); 
    });
    return new FormGroup(controls);
  });

  selectedParamSets$ = signal(() => {
    const formGroup = this.formGroup$();
    const selectedParamSets: { [key: string]: any } = {};
    const controls = formGroup.controls;
    Object.keys(controls).forEach((key) => {
      if (controls[key].value) {
        const paramSetIndex = parseInt(key.split('_')[1], 10) - 1;
        const paramSet = this.paramSets$()[paramSetIndex];
        selectedParamSets[key] = paramSet;
      }
    });
    console.log('selectedParamSets', selectedParamSets);
    return selectedParamSets;
  }
  );

  constructor() {
    effect(() => {
      const formGroup = this.formGroup$();
      formGroup.valueChanges.subscribe(() => {
        const selectedParamSets: { [key: string]: any } = {};
        const controls = formGroup.controls;
        Object.keys(controls).forEach((key) => {
          if (controls[key].value) {
            const paramSetIndex = parseInt(key.split('_')[1], 10) - 1;
            const paramSet = this.paramSets$()[paramSetIndex];
            selectedParamSets[key] = paramSet;
          }
        }
        );
        this.selectedParamSets$.set(() => {return selectedParamSets});
        return selectedParamSets;
      });
    }
    );

    // effect(() => {
    //   const highestKey = this.highestKey;
    //   if (highestKey) {
    //     const highest_index: number = highestKey().split('_')[1] as unknown as number;
    //     this.paramSets$()[highest_index] 
    //     // if (selectedParamSet) {
    //     //   this.selectedParamSets$.set(() => {return selectedParamSet});
    //     // }
    //   }
    // });
  }

  readonly runClassPerformance$ = resource({
    request: computed(() => {
      return {
        version: this.versionsService.versionReadOnly()(),
        cancer: this.selectedDisease$(),
        level: this.level$(),
        params: this.selectedParamSets$()(),
      };
    }),
    loader: async (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      const params = param.request.params;
      if (version === undefined || cancer === undefined || level === undefined || params === undefined)
        return [];
      const modelPerformances: RunClassPerformance[] = [];
      for (const [key, paramSet] of Object.entries(params)) {
        const tmp = await this.backend.getRunClassPerformance(version, cancer, level, paramSet);
        tmp.map((entry: RunClassPerformance) => {
          modelPerformances.push(entry);
        });
      }
      return modelPerformances;
    },
  });
}
