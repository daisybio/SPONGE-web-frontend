import {
  computed,
  effect,
  inject,
  Injectable,
  resource,
  ResourceRef,
  Signal,
  signal,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { BackendService } from '../../../../services/backend.service';
import {
  PredictCancerType,
  Dataset,
} from '../../../../interfaces';
import { EXAMPLE_PREDICTION_URL, EXAMPLE_SUBTYPE_PREDICTION_URL, SPONGE_EXAMPLE_URL } from '../../../../constants';
import { VersionsService } from '../../../../services/versions.service';
import { SpongEffectsService } from '../../../../services/spong-effects.service';
import { sortDiseaseNames } from '../../../../cancer-colors';

/** One module (a row of the enrichment score matrix), summarized over the selected samples */
export interface ModuleStats {
  /** Ensembl ID of the module center */
  gene: string;
  moduleIndex: number;
  mean: number;
  absMean: number;
  variance: number;
}

// The min-score fields show their defaults rounded down, so the top modules always pass them.
const floorTo3 = (value: number) => Math.floor(value * 1000) / 1000;
const isSet = (value: number | null): value is number => value !== null && value !== undefined && !isNaN(value);

export interface Query {
  useExampleExpression: boolean;
  file: File;
  mscor: number;
  fdr: number;
  minSize: number;
  maxSize: number;
  minExpr: number;
  method: string;
  logScaling: boolean;
  predictSubtypes: boolean;
  version: number;
  model: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PredictService {
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
  spongEffectsService = inject(SpongEffectsService);

  readonly formGroup = new FormGroup({
    useExampleExpression: new FormControl<boolean>(false, { nonNullable: true }),
    mscor: new FormControl<number>(0.1, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(1)],
    }),
    fdr: new FormControl(0.05, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(1)],
    }),
    minSize: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    maxSize: new FormControl(2000, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    minExpr: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    method: new FormControl('gsva', { nonNullable: true }),
    logScaling: new FormControl<boolean>(true, { nonNullable: true }),
    predictSubtypes: new FormControl<boolean>(false, { nonNullable: true }),
    model: new FormControl<string>("pancancer"),
  });
  readonly fileCtrl = new FormControl<File | null>(null);

  private readonly _query$ = signal<Query | undefined>(undefined);
  _subtypes$ = signal<boolean>(false);
  example_used = signal<boolean>(false);
  level = signal<'gene' | 'transcript'>('transcript');

  readonly selectedSamples$ = signal<string[]>([]);
  readonly includeModuleMembers$ = signal<boolean>(true);

  // Visualization filter signals
  readonly topNModules$ = signal<number>(1);
  readonly sortBy$ = signal<string>('absMeanEnrichmentScore');
  readonly minScore1$ = signal<number | null>(null);
  readonly minScore2$ = signal<number | null>(null);
  readonly showOrphans$ = signal<boolean>(false);
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
  readonly selectedVis$ = signal<string>('plot');
  readonly selectedHeatmapType$ = signal<'enrichment' | 'expression'>('enrichment');
  readonly selectedTabIndex$ = signal<number>(0);

  // Full SPONGE network dataset catalog (all diseases + subtypes). Only used to resolve a
  // full Dataset object (dataset_ID etc.) for whichever scope name is currently selected —
  // it is NOT the source of what scopes are selectable (see availableScopes$ below).
  readonly referenceDatasets$ = computed(
    () => this.versionsService.diseases$().value() || [],
  );

  allPredictedTypes$: Signal<string[]> = computed(() => {
    const prediction = this._prediction$.value();
    if (!prediction) return [];
    const data = prediction.data;
    if (!data) return [];
    const alltypes = Array.from(
      new Set(
        data
          .map((entry) => entry.typePrediction)
          .filter((t): t is string => !!t),
      ),
    );
    return alltypes;
  });

  selectedPredictedType$ = computed(() => {
    const prediction = this._prediction$.value();
    if (!prediction || !prediction.meta) return undefined;
    return prediction.meta[0].type_predict || undefined;
  });

  // The disease scope the current prediction's *primary* result belongs to: the predicted
  // type (pancancer model, type prediction ran), or the explicitly specified model
  // (type_predict comes back "NA" when a specific model was given), falling back to 'pancancer'.
  readonly activeModelScope$ = computed(() => {
    const meta = this._prediction$.value()?.meta?.[0];
    if (!meta) return 'pancancer';
    if (meta.type_predict && meta.type_predict !== 'NA') return meta.type_predict;
    if (meta.specified_type && meta.specified_type !== 'None' && meta.specified_type !== 'NA') {
      return meta.specified_type;
    }
    return 'pancancer';
  });

  // Disease scopes for which the prediction actually computed module enrichment scores:
  // 'pancancer' is always available (top-level `scores`); each key of `type_scores` adds a
  // type-specific scope. There is no separate subtype-level score set — subtype is only ever
  // a predicted label, so it is not offered here as a selectable scope.
  readonly availableScopes$ = computed(() => {
    const prediction = this._prediction$.value();
    const scopes = new Set<string>(['pancancer']);
    Object.keys(prediction?.type_scores ?? {}).forEach((k) => scopes.add(k));
    return sortDiseaseNames(Array.from(scopes));
  });

  // Writable scope selection driving both the module/network lookups and which score set
  // topModules$ is computed from. Defaults to whatever the prediction itself was run against.
  readonly selectedScope$ = linkedSignal<string>(() => {
    const scopes = this.availableScopes$();
    const active = this.activeModelScope$();
    return scopes.includes(active) ? active : (scopes[0] ?? 'pancancer');
  });

  // Full Dataset object (dataset_ID etc.) matching the selected scope, needed for the
  // background SPONGE ceRNA network fetch. 'pancancer' is a real dataset with its own
  // computed ceRNA network (dataset_ID 126) like any other scope.
  readonly selectedScopeDataset$ = computed(() => {
    const scope = this.selectedScope$();
    const datasets = this.referenceDatasets$();
    if (datasets.length === 0) return undefined;
    return (
      datasets.find((d: Dataset) => d.disease_name === scope && !d.disease_subtype) ??
      datasets.find((d: Dataset) => d.disease_name === scope) ??
      datasets[0]
    );
  });

  // The module enrichment score matrix for the currently selected scope: pancancer-level
  // `scores`, or the matching entry of `type_scores` for a type-level scope.
  readonly activeScores$ = computed(() => {
    const prediction = this._prediction$.value();
    if (!prediction) return undefined;
    const scope = this.selectedScope$();
    if (scope === 'pancancer') return prediction.scores;
    return prediction.type_scores?.[scope] ?? prediction.scores;
  });

  readonly allSamples$ = computed(() => this.activeScores$()?.samples || []);

  // Every module of the active score matrix, summarized over the selected samples (all samples if
  // none are selected), in matrix order.
  readonly moduleStats$ = computed<ModuleStats[]>(() => {
    const scores = this.activeScores$();
    if (!scores) return [];

    const selectedSamples = this.selectedSamples$();

    // Use selected samples or ALL samples if none are selected
    const sampleIndices =
      selectedSamples.length > 0
        ? selectedSamples
          .map((s) => scores.samples.indexOf(s))
          .filter((i) => i !== -1)
        : scores.samples.map((_, i) => i); // all indices

    if (sampleIndices.length === 0) return [];

    return scores.genes.map((gene, moduleIndex) => {
      const values = sampleIndices.map((sampleIndex) => scores.values[moduleIndex]?.[sampleIndex] ?? 0);
      const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
      const variance = values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length;
      return { gene, moduleIndex, mean, absMean: Math.abs(mean), variance };
    });
  });

  // All modules ranked by the "Sort by" choice, descending. The default is the absolute mean.
  readonly rankedModules$ = computed(() => {
    const sortBy = this.sortBy$();
    const key: 'mean' | 'absMean' | 'variance' =
      sortBy === 'varianceEnrichmentScore' ? 'variance' : sortBy === 'meanEnrichmentScore' ? 'mean' : 'absMean';
    return [...this.moduleStats$()].sort((a, b) => b[key] - a[key]);
  });

  /**
   * The top modules under the active "Sort by" and min-score filters. They are the patient
   * network's centers and the modules the Top ceRNA Modules plots, tables and heatmaps show as
   * top, so every view shows the same modules.
   */
  readonly topModules$ = computed(() => {
    const { minAbs, minVar } = this.effectiveMinScores$();
    return this.rankedModules$()
      .filter((m) => (!isSet(minAbs) || m.absMean >= minAbs) && (!isSet(minVar) || m.variance >= minVar))
      .slice(0, this.topNModules$());
  });

  readonly allScores$ = computed(() => {
    const pred = this._prediction$.value();
    if (!pred || !pred.scores || !pred.scores.values) return [];
    return pred.scores.values.flat();
  });

  readonly selectedParamSets$ = computed(() => {
    const vals = this.formGroup.value;
    return {
      run_1: {
        m_scor_threshold: vals.mscor ?? 0.1,
        p_adj_threshold: vals.fdr ?? 0.05,
        modules_cutoff: vals.minSize ?? 100
      }
    };
  });

  examplePrediction_type: Promise<PredictCancerType> = (async () => {
    const response = await fetch(EXAMPLE_PREDICTION_URL);
    const prediction = await response.json();
    return prediction;
  })();

  examplePrediction_subtype: Promise<PredictCancerType> = (async () => {
    const response = await fetch(EXAMPLE_SUBTYPE_PREDICTION_URL);
    const prediction = await response.json();
    return prediction;
  })();

  examplePrediction = computed(() => {
    if (this._subtypes$()) {
      return this.examplePrediction_subtype;
    } else {
      return this.examplePrediction_type;
    }
  });

  readonly _prediction$: ResourceRef<PredictCancerType | undefined> = resource({
    params: computed(() => {
      const query = this._query$();
      return {
        query,
        // Only depend on the example promise while NO real query drives the prediction. Otherwise
        // toggling "Predict subtypes" (which flips _subtypes$ -> examplePrediction()) would change
        // this param and re-run the loader, re-firing the expensive real backend R prediction with
        // the previous query. In example mode (no query) we DO want the toggle to swap the example.
        example: query ? null : this.examplePrediction(),
      };
    }),
    loader: async (param) => {
      const query = param.params.query;
      let prediction: PredictCancerType | undefined;
      if (!query) {
        const example = await this.examplePrediction();
        this.example_used.set(true);
        // Make a copy so we can mutate user_umap if needed
        prediction = JSON.parse(JSON.stringify(example));
      } else {
        if (!query.useExampleExpression) {
          this.example_used.set(false);
        }
        prediction = await this.backend.predictCancerType(
          query.version,
          query.file,
          query.predictSubtypes,
          query.logScaling,
          query.mscor,
          query.fdr,
          query.minSize,
          query.maxSize,
          query.minExpr,
          query.method,
          query.model,
          // a new query aborts this loader; stop polling the superseded job
          param.abortSignal,
        );
      }

      // Dynamically fetch UMAP coordinates if not present in response (e.g. static example file)
      if (prediction && !('user_umap' in prediction) && prediction.scores) {
        try {
          const level = prediction.meta?.[0]?.level || 'gene';
          const umapData = await this.backend.getUmapProjection(level, prediction.scores);
          if (umapData) {
            (prediction as any).user_umap = umapData.user_umap;
            (prediction as any).tcga_umap = umapData.tcga_umap;
          }
        } catch (e) {
          console.error('Error fetching UMAP projection dynamically', e);
        }
      }

      return prediction;
    },
  });

  public get isLoading$() {
    return this._prediction$.isLoading;
  }

  public get prediction$() {
    return this._prediction$.value.asReadonly();
  }

  private lastAutoMinScore1: number | null = null;
  private lastAutoMinScore2: number | null = null;

  // The lowest |mean| and variance among the top N of the current ranking. The min-score fields
  // default to these, so by default all of the top N pass them.
  readonly defaultMinScores$ = computed(() => {
    const topN = this.rankedModules$().slice(0, this.topNModules$());
    if (topN.length === 0) return { minAbs: 0, minVar: 0 };

    const minAbs = Math.min(...topN.map(m => m.absMean));
    const minVar = Math.min(...topN.map(m => m.variance));

    return { minAbs, minVar };
  });

  /**
   * The min-score filters in force. A field still showing its auto-filled value counts as the
   * current default: after a ranking change the effect that refills the fields may not have run
   * yet, and the network must not filter the new ranking with the previous one's minimums.
   */
  private readonly effectiveMinScores$ = computed(() => {
    const defaults = this.defaultMinScores$();
    const min1 = this.minScore1$();
    const min2 = this.minScore2$();
    return {
      minAbs: min1 === null || min1 === this.lastAutoMinScore1 ? floorTo3(defaults.minAbs) : min1,
      minVar: min2 === null || min2 === this.lastAutoMinScore2 ? floorTo3(defaults.minVar) : min2,
    };
  });

  constructor() {
    // Keep the app-wide selected disease (used by Browse/Explore) in sync with whatever scope
    // the predict view is currently showing, so navigating to Browse preselects it. Only write
    // when the enrichment view is the active spongEffects mode — otherwise this fights the
    // ExploreService, which also pushes its own selected disease into the same global signal.
    effect(() => {
      const scope = this.selectedScope$();
      const mode = this.spongEffectsService.selectedMode$();
      if (scope && mode !== 'explore') {
        untracked(() => {
          if (this.versionsService.selectedDiseaseName$() !== scope) {
            this.versionsService.selectedDiseaseName$.set(scope);
          }
        });
      }
    });

    // Auto-select all available samples by default
    effect(() => {
      const samples = this.allSamples$();
      untracked(() => {
        this.selectedSamples$.set(samples);
      });
    });

    // Dynamically fill minimum score filters with the minimums of the shown nodes
    effect(() => {
      const defaults = this.defaultMinScores$();
      untracked(() => {
        const current1 = this.minScore1$();
        if (current1 === null || current1 === this.lastAutoMinScore1) {
          const roundedAbs = floorTo3(defaults.minAbs);
          this.lastAutoMinScore1 = roundedAbs;
          this.minScore1$.set(roundedAbs);
        }

        const current2 = this.minScore2$();
        if (current2 === null || current2 === this.lastAutoMinScore2) {
          const roundedVar = floorTo3(defaults.minVar);
          this.lastAutoMinScore2 = roundedVar;
          this.minScore2$.set(roundedVar);
        }
      });
    });

    // Auto-update level in sync with the loaded prediction's level metadata
    effect(() => {
      const prediction = this.prediction$();
      if (prediction) {
        const level = prediction.meta?.[0]?.level;
        if (level === 'gene' || level === 'transcript') {
          untracked(() => {
            this.level.set(level);
          });
        }
      }
    });
  }

  request(query: Query) {
    // A new prediction means new input expression — drop the cached parse.
    this.uploadedExpressionCache = undefined;
    this._query$.set(query);
  }

  // ---- Uploaded expression matrix (for the expression heatmap) --------------------------
  // The prediction was computed from the user's uploaded expression CSV (or the example file).
  // The raw matrix isn't in the prediction response, so we parse it client-side, once, and
  // cache it. Sample columns line up with prediction.scores.samples.
  private uploadedExpressionCache: Promise<{ samples: string[]; values: Map<string, number[]> }> | undefined;

  async getUploadedExpression(): Promise<{ samples: string[]; values: Map<string, number[]> }> {
    if (!this.uploadedExpressionCache) {
      this.uploadedExpressionCache = (async () => {
        const query = this._query$();
        const useExample = query ? query.useExampleExpression : true;
        const file = (!useExample && query?.file) ? query.file : this.fileCtrl.value;
        let text: string;
        if (file && !useExample) {
          text = await file.text();
        } else {
          text = await (await fetch(SPONGE_EXAMPLE_URL)).text();
        }
        return parseExpressionMatrix(text);
      })().catch((e) => {
        console.error('Failed to parse uploaded expression matrix', e);
        this.uploadedExpressionCache = undefined; // allow retry
        return { samples: [], values: new Map<string, number[]>() };
      });
    }
    return this.uploadedExpressionCache;
  }
}

/**
 * Parse an expression CSV/TSV where rows are genes/transcripts (Ensembl IDs in the first
 * column) and columns are samples (IDs in the header row). Returns the sample list and a
 * per-feature array of values aligned to that sample order.
 */
function parseExpressionMatrix(text: string): { samples: string[]; values: Map<string, number[]> } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { samples: [], values: new Map() };

  const delim = [',', '\t', ';'].reduce((best, d) =>
    lines[0].split(d).length > lines[0].split(best).length ? d : best, ',');

  const header = lines[0].split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
  const samples = header.slice(1); // first header cell is the ID-column label
  const values = new Map<string, number[]>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    const id = cols[0].trim().replace(/^"|"$/g, '');
    if (!id) continue;
    const row = new Array<number>(samples.length);
    for (let j = 0; j < samples.length; j++) {
      const v = parseFloat(cols[j + 1]);
      row[j] = isNaN(v) ? 0 : v;
    }
    values.set(id, row);
  }
  return { samples, values };
}
