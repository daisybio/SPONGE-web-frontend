import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  linkedSignal,
  resource,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

  level$ = signal<'gene' | 'transcript'>('gene');
  selectedTabIndex$ = signal<number>(0);
  lineTop = signal<number | undefined>(undefined); // height of the separator to the network -> align the form in the side panel
  diseaseNames$ = this.spongEffectsService.diseaseNames$;
  diseases$ = this.spongEffectsService.datasets$;

  selectedDisease$: WritableSignal<string | undefined> = linkedSignal({
    source: () => {
      const global = this.versionsService.selectedDiseaseName$();
      const names = this.diseaseNames$();
      if (global && names.includes(global)) {
        return global;
      }
      return names[0];
    },
    computation: (source) => source
  });

  selectedDiseaseObject$: WritableSignal<Dataset> = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    const datasets = this.diseases$();
    const selectedDataset = datasets.find(
      (d) => d.disease_name === selectedDisease,
    );
    if (!selectedDataset) {
      return {} as Dataset;
    }
    return selectedDataset;
  });
  highestKey: WritableSignal<string> = signal<string>(''); // best model for the selected disease and level, e.g. 'paramSet_1'
  highestParamSet = computed(() => {
    const index = this.highestKey().split('_')[1];
    return this.paramSets$()[parseInt(index, 10) - 1];
  });
  selectedVis = signal<string>('plot');

  // For each disease, there are multiple spongeffects runs — filter to get runs for selected disease
  spongeEffectsRuns$ = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    let runs = this.spongEffectsService.spongEffectsRuns$.value() || [];
    runs = runs.filter((run) => run.disease_name === selectedDisease);
    return runs;
  });

  // Unique param sets (m_scor_threshold, p_adj_threshold, modules_cutoff)
  paramSets$ = computed(() => {
    const runs = this.spongeEffectsRuns$();
    const paramSets = runs.map((run) => ({
      m_scor_threshold: run.m_scor_threshold,
      p_adj_threshold: run.p_adj_threshold,
      modules_cutoff: run.modules_cutoff,
    }));
    // remove duplicates
    return paramSets.filter((paramSet, index, self) =>
      index === self.findIndex((d) =>
        d.m_scor_threshold === paramSet.m_scor_threshold &&
        d.p_adj_threshold === paramSet.p_adj_threshold &&
        d.modules_cutoff === paramSet.modules_cutoff
      )
    );
  });

  formGroup$ = computed(() => {
    const paramSets = this.paramSets$();
    const controls: { [key: string]: any } = {};
    paramSets.forEach((_paramSet, index) => {
      const key = `paramSet_${index + 1}`;
      controls[key] = new FormControl<boolean>(true);
    });
    return new FormGroup(controls);
  });

  /**
   * Writable signal containing the currently selected param sets (as an object map).
   * Updated reactively from formGroup$ changes.
   */
  readonly selectedParamSets$: WritableSignal<{ [key: string]: any }> = signal({});

  constructor() {
    // Sync local selected disease back to global VersionsService state
    effect(() => {
      const localSelected = this.selectedDisease$();
      if (localSelected) {
        untracked(() => {
          if (this.versionsService.selectedDiseaseName$() !== localSelected) {
            this.versionsService.selectedDiseaseName$.set(localSelected);
          }
        });
      }
    });

    // Whenever formGroup$ changes (i.e., disease changes), re-initialize selectedParamSets$
    // and subscribe to form value changes — using takeUntilDestroyed to avoid leaks.
    effect(() => {
      const formGroup = this.formGroup$();

      // Initialize with current form values (all checked by default)
      this._syncSelectedParamSets(formGroup);

      // Subscribe to future changes; takeUntilDestroyed handles unsubscribe
      formGroup.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this._syncSelectedParamSets(formGroup);
        });
    });
  }

  private _syncSelectedParamSets(formGroup: FormGroup): void {
    const selectedParamSets: { [key: string]: any } = {};
    const controls = formGroup.controls;
    Object.keys(controls).forEach((key) => {
      if (controls[key].value) {
        const paramSetIndex = parseInt(key.split('_')[1], 10) - 1;
        const paramSet = this.paramSets$()[paramSetIndex];
        selectedParamSets[key] = paramSet;
      }
    });
    this.selectedParamSets$.set(selectedParamSets);
  }

  // For the class performance tab
  readonly runClassPerformance$ = resource({
    request: computed(() => {
      return {
        version: this.versionsService.versionReadOnly()(),
        cancer: this.selectedDisease$(),
        level: this.level$(),
        params: this.selectedParamSets$(),
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
      for (const [_key, paramSet] of Object.entries(params)) {
        const tmp = await this.backend.getRunClassPerformance(version, cancer, level, paramSet);
        tmp.map((entry: RunClassPerformance) => {
          modelPerformances.push(entry);
        });
      }
      return modelPerformances;
    },
  });

  // For the top ceRNA modules tab
  topN = signal<number | undefined>(15);
  redNodes = signal<number | undefined>(5);
  includeModuleMembers = signal<boolean | null>(true);
  sortBy = signal<string>('');
  minScore1 = signal<number | null>(null);
  minScore2 = signal<number | null>(null);

  selectedModules = resource({
    request: () => ({
      redNodes: this.redNodes(),
      version: this.versionsService.versionReadOnly()(),
      disease: this.selectedDisease$(),
      level: this.level$(),
      selectedParamSets: this.selectedParamSets$(),
      topN: this.topN(),
    }),
    loader: async ({ request }) => {
      const { redNodes, version, disease, level, selectedParamSets, topN } = request;
      if (!version || !disease || !level || !selectedParamSets) {
        return [];
      }
      let modules: SpongEffectsModule[] = [];
      const paramSetValues = Object.values(selectedParamSets);
      if (level === 'gene') {
        const results = await Promise.all(paramSetValues.map(paramSet =>
          this.backend.getSpongEffectsGeneModules(version, disease, paramSet, topN)
        ));
        results.forEach(tmp => {
          modules.push(...tmp.map(entry => ({
            ensemblID: entry.gene.ensg_number,
            symbol: entry.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_gene_module_ID,
          })));
        });
      } else {
        const results = await Promise.all(paramSetValues.map(paramSet =>
          this.backend.getSpongEffectsTranscriptModules(version, disease, paramSet, topN)
        ));
        results.forEach(tmp => {
          modules.push(...tmp.map(entry => ({
            ensemblID: entry.transcript.enst_number,
            symbol: entry.transcript.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_transcript_module_ID,
          })));
        });
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
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
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
