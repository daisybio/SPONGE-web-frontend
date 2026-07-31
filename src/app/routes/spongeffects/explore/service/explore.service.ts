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

  level$ = signal<'gene' | 'transcript'>('transcript');
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

  // Subtype selection (mirrors the Browse disease-selector). Resets to the unspecific subtype
  // (null) whenever the disease changes. No spongEffects datasets carry subtypes yet, so the
  // dropdown is present but effectively single-option today — it becomes active automatically
  // once subtype datasets exist.
  selectedSubtype$: WritableSignal<string | null> = linkedSignal({
    source: () => this.selectedDisease$(),
    computation: () => null,
  });

  // The datasets available for the current disease — one per subtype (incl. the unspecific one).
  availableSubtypes$ = computed(() => {
    const disease = this.selectedDisease$();
    return this.diseases$().filter((d) => d.disease_name === disease);
  });

  readonly diseaseSampleCounts$ = computed(() => {
    const counts = new Map<string, number>();
    (this.diseases$() || []).forEach((d) => {
      if (!counts.has(d.disease_name) || d.disease_subtype == null || d.disease_subtype === '') {
        counts.set(d.disease_name, d.sample_count);
      }
    });
    return counts;
  });

  selectedDiseaseObject$: WritableSignal<Dataset> = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    const subtype = this.selectedSubtype$();
    const matches = this.diseases$().filter((d) => d.disease_name === selectedDisease);
    const bySubtype = matches.find((d) => (d.disease_subtype ?? null) === (subtype ?? null));
    return bySubtype ?? matches.find((d) => d.disease_subtype == null) ?? matches[0] ?? ({} as Dataset);
  });
  highestKey: WritableSignal<string> = signal<string>(''); // best model for the selected disease and level, e.g. 'paramSet_1'
  highestParamSet = computed(() => {
    const index = this.highestKey().split('_')[1];
    return this.paramSets$()[parseInt(index, 10) - 1];
  });
  selectedVis = signal<string>('plot');
  selectedHeatmapType = signal<'enrichment' | 'expression'>('enrichment');

  // Network-filter signals — mirror PredictService so the shared <app-network-filters> drawer
  // (NetworkFilterSignals) drives the Explore reference network. Defaults match the values the
  // old <app-form> was seeded with for Explore.
  readonly showOrphans$ = signal<boolean>(true);
  readonly sortingBetweenness$ = signal<boolean>(true);
  readonly sortingEigenvector$ = signal<boolean>(false);
  readonly sortingDegree$ = signal<boolean>(false);
  readonly maxNodes$ = signal<number>(10);
  readonly minDegree$ = signal<number>(0);
  readonly minBetweenness$ = signal<number>(0);
  readonly minEigen$ = signal<number>(0);
  readonly interactionSorting$ = signal<string>('pValue');
  readonly maxInteractions$ = signal<number>(100);
  readonly maxPValue$ = signal<number>(1);
  readonly minMscor$ = signal<number>(0);
  readonly geneType$ = signal<string>('all');
  readonly supportFilter$ = signal<'all' | 'has_inverse' | 'no_inverse'>('all');

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

  readonly formGroup = new FormGroup<any>({});

  /**
   * Writable signal containing the currently selected param sets (as an object map).
   * Updated reactively from formGroup changes.
   */
  readonly selectedParamSets$: WritableSignal<{ [key: string]: any }> = signal({});

  constructor() {
    // Sync local selected disease back to global VersionsService state. Only write when the
    // explore view is the active spongEffects mode — the explore and enrichment views are both
    // instantiated at once (hidden), so without this gate explore's fallback disease would
    // overwrite the scope the enrichment/predict view pushes for the Browse preselection.
    effect(() => {
      const localSelected = this.selectedDisease$();
      const mode = this.spongEffectsService.selectedMode$();
      if (localSelected && mode === 'explore') {
        untracked(() => {
          if (this.versionsService.selectedDiseaseName$() !== localSelected) {
            this.versionsService.selectedDiseaseName$.set(localSelected);
          }
        });
      }
    });

    // Dynamically update formGroup controls whenever paramSets$ changes (e.g. disease changes)
    effect(() => {
      const paramSets = this.paramSets$();
      const currentControlKeys = Object.keys(this.formGroup.controls);

      // Remove controls that no longer exist
      currentControlKeys.forEach((key) => {
        this.formGroup.removeControl(key, { emitEvent: false });
      });

      // Add controls for current paramSets (checked by default)
      paramSets.forEach((_paramSet, index) => {
        const key = `paramSet_${index + 1}`;
        this.formGroup.addControl(key, new FormControl<boolean>(true), { emitEvent: false });
      });

      this._syncSelectedParamSets();
    });

    // Subscribe to form value changes
    this.formGroup.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._syncSelectedParamSets();
      });
  }

  private _syncSelectedParamSets(): void {
    const selectedParamSets: { [key: string]: any } = {};
    const controls = this.formGroup.controls;
    Object.keys(controls).forEach((key) => {
      if (controls[key]?.value) {
        const paramSetIndex = parseInt(key.split('_')[1], 10) - 1;
        const paramSet = this.paramSets$()[paramSetIndex];
        if (paramSet) {
          selectedParamSets[key] = paramSet;
        }
      }
    });
    this.selectedParamSets$.set(selectedParamSets);
  }

  // For the class performance tab
  readonly runClassPerformance$ = resource({
    params: computed(() => {
      return {
        version: this.versionsService.versionReadOnly()(),
        cancer: this.selectedDisease$(),
        level: this.level$(),
        params: this.selectedParamSets$(),
      };
    }),
    loader: async (param) => {
      const version = param.params.version;
      const cancer = param.params.cancer;
      const level = param.params.level;
      const params = param.params.params;
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
  topN = signal<number | undefined>(1);
  includeModuleMembers = signal<boolean | null>(true);
  sortBy = signal<string>('');
  minScore1 = signal<number | null>(null);
  minScore2 = signal<number | null>(null);

  selectedModules = resource({
    params: () => ({
      version: this.versionsService.versionReadOnly()(),
      disease: this.selectedDisease$(),
      level: this.level$(),
      selectedParamSets: this.selectedParamSets$(),
      topN: this.topN(),
    }),
    loader: async ({ params }) => {
      const { version, disease, level, selectedParamSets, topN } = params;
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
      return modules.slice(0, topN);
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
      const response = await this.spongEffectsService.getGeneModuleMembers(
        version, disease, { ensemblID: module.ensemblID }
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
      const response = await this.spongEffectsService.getTranscriptModuleMembers(
        version, disease, { ensemblID: module.ensemblID }
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
