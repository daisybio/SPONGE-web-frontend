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
import {
  Dataset,
  ModuleMember,
  RunClassPerformance,
  SpongEffectsModule,
  SpongEffectsParamSet,
  SpongEffectsRun,
} from '../../../../interfaces';
import { VersionsService } from '../../../../services/versions.service';
import { BackendService } from '../../../../services/backend.service';
import { FormControl, FormGroup } from '@angular/forms';

/** Identity of a param set, used to match the same model across disease/level switches. */
function paramSetKey(paramSet: SpongEffectsParamSet): string {
  return `${paramSet.m_scor_threshold}|${paramSet.p_adj_threshold}|${paramSet.modules_cutoff}`;
}

function runMatchesParamSet(run: SpongEffectsRun, paramSet: SpongEffectsParamSet): boolean {
  return (
    run.m_scor_threshold === paramSet.m_scor_threshold &&
    run.p_adj_threshold === paramSet.p_adj_threshold &&
    run.modules_cutoff === paramSet.modules_cutoff
  );
}

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

  // For each disease there are multiple spongEffects runs, at BOTH gene and transcript level. The
  // model/param-set list and benchmarking are level-specific (a disease can have a different number
  // of models per level — e.g. BRCA: 3 gene, 2 transcript), so filter by disease AND level.
  // Otherwise the Model panel shows the union across levels while benchmarking only has data for
  // the current level's subset (Model panel says 3, benchmarking shows 2).
  readonly spongeEffectsRuns$ = computed(() => {
    const selectedDisease = this.selectedDisease$();
    const level = this.level$();
    const runs = this.spongEffectsService.spongEffectsRuns$.value() || [];
    return runs.filter((run) => run.disease_name === selectedDisease && run.level === level);
  });

  // Unique param sets (m_scor_threshold, p_adj_threshold, modules_cutoff)
  readonly paramSets$ = computed<SpongEffectsParamSet[]>(() => {
    const paramSets = this.spongeEffectsRuns$().map((run) => ({
      m_scor_threshold: run.m_scor_threshold,
      p_adj_threshold: run.p_adj_threshold,
      modules_cutoff: run.modules_cutoff,
    }));
    // remove duplicates
    return paramSets.filter((paramSet, index, self) =>
      index === self.findIndex((d) => paramSetKey(d) === paramSetKey(paramSet))
    );
  });

  // Carry the user's selection across disease/level switches by matching the threshold values
  // instead of the positional index — the same model can sit at a different index elsewhere, and
  // a level may expose fewer models. Falls back to "all selected" when nothing carries over.
  readonly selectedParamSetIndices = linkedSignal<SpongEffectsParamSet[], Set<number>>({
    source: () => this.paramSets$(),
    computation: (paramSets, previous) => {
      const all = new Set(paramSets.map((_, index) => index));
      if (previous === undefined) {
        return all;
      }
      const previousKeys = new Set(
        previous.source.filter((_, index) => previous.value.has(index)).map(paramSetKey)
      );
      if (previousKeys.size === previous.source.length) {
        return all; // everything was selected — keep it that way for the new list
      }
      const carried = new Set<number>();
      paramSets.forEach((paramSet, index) => {
        if (previousKeys.has(paramSetKey(paramSet))) {
          carried.add(index);
        }
      });
      return carried.size > 0 ? carried : all;
    },
  });

  /**
   * Computed signal containing the currently selected param sets (as an object map).
   */
  readonly selectedParamSets$ = computed<{ [key: string]: any }>(() => {
    const paramSets = this.paramSets$();
    const selectedIndices = this.selectedParamSetIndices();
    const result: { [key: string]: any } = {};
    paramSets.forEach((paramSet, index) => {
      if (selectedIndices.has(index)) {
        result[`paramSet_${index + 1}`] = paramSet;
      }
    });
    return result;
  });

  // Accuracy of every model of the selected disease + level. Passing no param set returns all runs
  // in one request, so the "best model" marker is available without opening the Benchmarking tab
  // and stays put when models are deselected.
  private readonly runPerformance$ = resource({
    params: () => ({
      version: this.versionsService.versionReadOnly()(),
      disease: this.selectedDisease$(),
      level: this.level$(),
    }),
    loader: async ({ params }) => {
      const { version, disease, level } = params;
      if (version === undefined || disease === undefined || level === undefined) {
        return [];
      }
      // The API answers with a "no content" object instead of an array when nothing matches.
      const performances = await this.backend.getRunPerformance(version, disease, level, {});
      return Array.isArray(performances) ? performances : [];
    },
  });

  /** Best model for the selected disease and level, as a paramSets$ key, e.g. 'paramSet_1'. */
  readonly highestKey: Signal<string> = computed(() => {
    const paramSets = this.paramSets$();
    let highestAccuracy = -Infinity;
    let highestKey = '';
    for (const entry of this.runPerformance$.value() ?? []) {
      if (entry.model_type !== 'modules' || entry.split_type !== 'test') continue;
      if (entry.accuracy <= highestAccuracy) continue;
      const index = paramSets.findIndex((paramSet) => runMatchesParamSet(entry.spongEffects_run, paramSet));
      if (index === -1) continue;
      highestAccuracy = entry.accuracy;
      highestKey = `paramSet_${index + 1}`;
    }
    return highestKey;
  });

  readonly highestParamSet = computed(() => {
    const index = this.highestKey().split('_')[1];
    return this.paramSets$()[parseInt(index, 10) - 1];
  });

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
  }

  /**
   * Select/deselect one model. Returns false when the change was rejected because at least one
   * model has to stay selected — the caller is then responsible for undoing its optimistic UI.
   */
  setParamSetIndexSelected(index: number, selected: boolean): boolean {
    const current = this.selectedParamSetIndices();
    if (current.has(index) === selected) {
      return true;
    }
    if (!selected && current.size <= 1) {
      return false;
    }
    const next = new Set(current);
    if (selected) {
      next.add(index);
    } else {
      next.delete(index);
    }
    this.selectedParamSetIndices.set(next);
    return true;
  }

  isParamSetIndexSelected(index: number): boolean {
    return this.selectedParamSetIndices().has(index);
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
        if (Array.isArray(tmp)) {
          tmp.forEach((entry: RunClassPerformance) => {
            modelPerformances.push(entry);
          });
        }
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
      let rawModules: SpongEffectsModule[] = [];
      const paramSetValues = Object.values(selectedParamSets);
      if (level === 'gene') {
        const results = await Promise.all(paramSetValues.map(paramSet =>
          this.backend.getSpongEffectsGeneModules(version, disease, paramSet, topN)
        ));
        results.forEach(tmp => {
          if (Array.isArray(tmp)) {
            rawModules.push(...tmp.map(entry => ({
              ensemblID: entry.gene.ensg_number,
              symbol: entry.gene.gene_symbol,
              meanGiniDecrease: entry.mean_gini_decrease,
              meanAccuracyDecrease: entry.mean_accuracy_decrease,
              spongEffects_run_ID: entry.spongEffects_run_ID,
              spongEffects_module_ID: entry.spongEffects_gene_module_ID,
            })));
          }
        });
      } else {
        const results = await Promise.all(paramSetValues.map(paramSet =>
          this.backend.getSpongEffectsTranscriptModules(version, disease, paramSet, topN)
        ));
        results.forEach(tmp => {
          if (Array.isArray(tmp)) {
            rawModules.push(...tmp.map(entry => ({
              ensemblID: entry.transcript.enst_number,
              symbol: entry.transcript.gene.gene_symbol,
              meanGiniDecrease: entry.mean_gini_decrease,
              meanAccuracyDecrease: entry.mean_accuracy_decrease,
              spongEffects_run_ID: entry.spongEffects_run_ID,
              spongEffects_module_ID: entry.spongEffects_transcript_module_ID,
            })));
          }
        });
      }

      // Deduplicate modules by ensemblID
      const uniqueMap = new Map<string, SpongEffectsModule>();
      for (const mod of rawModules) {
        const existing = uniqueMap.get(mod.ensemblID);
        if (!existing) {
          uniqueMap.set(mod.ensemblID, mod);
        } else {
          uniqueMap.set(mod.ensemblID, {
            ...existing,
            meanGiniDecrease: Math.max(existing.meanGiniDecrease, mod.meanGiniDecrease),
            meanAccuracyDecrease: Math.max(existing.meanAccuracyDecrease, mod.meanAccuracyDecrease),
          });
        }
      }

      return Array.from(uniqueMap.values()).slice(0, topN);
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

    // Fetch members for THIS module by its ID (not by center ensg_number, which would resolve to
    // the best-accuracy run's module and could mismatch the selected param-set's center).
    const memberOpts = module.spongEffects_module_ID != null
      ? { moduleId: module.spongEffects_module_ID }
      : { ensemblID: module.ensemblID };

    if (level === 'gene') {
      const response = await this.spongEffectsService.getGeneModuleMembers(
        version, disease, memberOpts
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
        version, disease, memberOpts
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
