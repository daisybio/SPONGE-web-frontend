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
import { Dataset, ModuleMember, RunClassPerformance, SpongEffectsModule } from '../../../../interfaces';
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
  lineTop = signal<number | undefined>(undefined); // this is the height of the separator to the network -> align the form in the side panel 
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
  highestKey: WritableSignal<string> = signal<string>(''); // this is the best model for the selected disease and level, e.g. 'paramSet_1'
  highestParamSet = computed(() => {
    const index = this.highestKey().split('_')[1];
    return this.paramSets$()[parseInt(index, 10) - 1];
  });
  selectedVis = signal<string>('centers');

  // for each disease, there are multiple spongeffects runs. Filter spongEffectsService.SpongeffectsRuns$ to get the runs for the selected disease
  spongeEffectsRuns$ = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    let runs = this.spongEffectsService.spongEffectsRuns$.value() || [];
    // then filter
    runs = runs.filter((run) => run.disease_name === selectedDisease);
    return runs;
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
  });

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

  // for the class performance tab
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


  // for the top ceRNA modules tab
  topN = signal<number | undefined>(15); 
  redNodes = signal<number | undefined>(5); 
  includeModuleMembers = signal<boolean | null>(false);


  selectedModules = resource({
    request: () => ({
      redNodes: this.redNodes(),
      version: this.versionsService.versionReadOnly()(),
      disease: this.selectedDisease$(),
      level: this.level$(),
      selectedParamSets: this.selectedParamSets$()(),
      topN: this.topN(),
    }),
    loader: async ({ request }) => {
      const { redNodes, version, disease, level, selectedParamSets, topN } = request;
      if (!version || !disease || !level || !selectedParamSets) {
        return [];
      }
      // Use the same logic as in getLollipopData
      let modules: SpongEffectsModule[] = [];
      if (level === 'gene') {
        for (const paramSet of Object.values(selectedParamSets)) {
          const tmp = await this.backend.getSpongEffectsGeneModules(version, disease, paramSet, topN);
          modules.push(...tmp.map(entry => ({
            ensemblID: entry.gene.ensg_number,
            symbol: entry.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_gene_module_ID,
          })));
        }
      } else {
        for (const paramSet of Object.values(selectedParamSets)) {
          const tmp = await this.backend.getSpongEffectsTranscriptModules(version, disease, paramSet, topN);
          modules.push(...tmp.map(entry => ({
            ensemblID: entry.transcript.enst_number,
            symbol: entry.transcript.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_transcript_module_ID,
          })));
        }
      }
      return modules.slice(0, redNodes);
    }
  });


  moduleMembersMap = new Map<string, ModuleMember[]>();
  MAX_ELEMENTS = 100;

  async fetchModuleMembers(module: SpongEffectsModule): Promise<void> {
    const version = this.versionsService.versionReadOnly()();
    const disease = this.selectedDisease$();
    const level = this.level$();
    
    if (!version || !disease || !level) return;
    
    let members: ModuleMember[] = [];
    const key = this.getModuleKey(module);
    
    if (level === 'gene') {
      const response = await this.backend.getSpongEffectsGeneModuleMembers(
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
      );
      
      members = response.map(r => ({
        ensemblID: r.gene.ensg_number,
        symbol: r.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID
      }));
    } else {
      const response = await this.backend.getSpongEffectsTranscriptModuleMembers(
        version, disease, module.ensemblID, this.MAX_ELEMENTS
      );
      
      members = response.map(r => ({
        ensemblID: r.transcript.enst_number,
        symbol: r.transcript.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID
      }));
    }
    
    this.moduleMembersMap.set(key, members);
  }

  getModuleKey(module: SpongEffectsModule): string {
    return `${module.ensemblID}_${module.spongEffects_run_ID}`;
  }

}
