import {
  computed,
  effect,
  inject,
  Injectable,
  Resource,
  resource,
  ResourceRef,
  Signal,
  signal,
  WritableSignal,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { BackendService } from '../../../../services/backend.service';
import {
  NetworkData,
  PredictCancerType,
  GeneNode,
  GeneInteraction,
  Dataset,
  BrowseQuery,
  InteractionSorting,
  TranscriptNode,
} from '../../../../interfaces';
import { EXAMPLE_PREDICTION_URL, EXAMPLE_SUBTYPE_PREDICTION_URL } from '../../../../constants';
import { VersionsService } from '../../../../services/versions.service';
import { SpongEffectsService } from '../../../../services/spong-effects.service';

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

  private moduleIDCache = new Map<string, number>();
  private moduleMembersCache = new Map<string, any[]>();

  private async runWithLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    const executing = new Set<Promise<any>>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const p = (async () => {
        const res = await fn(item);
        results[i] = res;
      })();

      executing.add(p);
      p.then(() => executing.delete(p));

      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

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
  level = signal<'gene' | 'transcript'>('gene');

  readonly selectedSamples$ = signal<string[]>([]);
  readonly includeModuleMembers$ = signal<boolean>(true);

  // Visualization filter signals
  readonly topNModules$ = signal<number>(10);
  readonly showOrphans$ = signal<boolean>(true);
  readonly maxNodes$ = signal<number>(100);
  readonly minDegree$ = signal<number>(0);
  readonly minBetweenness$ = signal<number>(0);
  readonly minEigen$ = signal<number>(0);
  readonly maxPValue$ = signal<number>(1.0);
  readonly minMscor$ = signal<number>(0.0);

  readonly allSamples$ = computed(() => {
    const prediction = this._prediction$.value();
    return prediction?.scores?.samples || [];
  });

  // All SPONGE network datasets (with subtypes), used for the reference network selector
  readonly referenceDatasets$ = computed(
    () => this.versionsService.diseases$().value() || [],
  );
  // Unique disease names from the full SPONGE dataset list
  readonly referenceDiseases$ = computed(() =>
    Array.from(
      new Set(this.referenceDatasets$().map((d: Dataset) => d.disease_name)),
    ).sort(),
  );

  // Writable full Dataset selection — updated by DiseaseSelectorComponent
  readonly selectedReferenceDataset$ = linkedSignal<Dataset | undefined>(() => {
    console.log('Recomputing selectedReferenceDataset$');
    const predicted = this.selectedPredictedType$();
    const datasets = this.referenceDatasets$();
    if (!datasets || datasets.length === 0) return undefined;
    if (predicted) {
      const match = datasets.find(
        (d: Dataset) => d.disease_name === predicted && !d.disease_subtype,
      );
      if (match) return match;
    }
    const globalName = this.versionsService.selectedDiseaseName$();
    if (globalName) {
      const match = datasets.find((d: Dataset) => d.disease_name === globalName);
      if (match) return match;
    }
    return datasets[0];
  });

  // Keep string accessors for DiseaseSelectorComponent compatibility
  readonly selectedReferenceDisease$ = computed(
    () => this.selectedReferenceDataset$()?.disease_name,
  );
  readonly selectedDataset$ = this.selectedReferenceDataset$;

  allPredictedTypes$: Signal<string[]> = computed(() => {
    console.log('Recomputing allPredictedTypes$');
    const prediction = this._prediction$.value();
    if (!prediction) {
      console.log('No prediction available, returning empty array');
      return [];
    }
    const data = prediction.data;
    if (!data) {
      console.log('No data available, returning empty array');
      return [];
    }
    const alltypes = Array.from(
      new Set(
        data.map((entry: { typePrediction: string }) => entry.typePrediction),
      ),
    );
    console.log('alltypes', alltypes);
    return alltypes;
  });

  selectedPredictedType$ = computed(() => {
    console.log('Recomputing selectedPredictedType$');
    const prediction = this._prediction$.value();
    if (!prediction || !prediction.meta) {
      console.log('No prediction meta available, returning undefined');
      return undefined;
    }
    return prediction.meta[0].type_predict || undefined;
  });

  readonly topModules$ = computed(() => {
    const prediction = this._prediction$.value();
    if (!prediction?.scores) return [];

    const scores = prediction.scores;
    const selectedSamples = this.selectedSamples$();

    // Use selected samples or ALL samples if none are selected
    const sampleIndices =
      selectedSamples.length > 0
        ? selectedSamples
          .map((s) => scores.samples.indexOf(s))
          .filter((i) => i !== -1)
        : scores.samples.map((_, i) => i); // all indices

    if (sampleIndices.length === 0) return [];

    const moduleScores = scores.genes.map((gene, moduleIndex) => {
      const sum = sampleIndices.reduce(
        (acc, sampleIndex) =>
          acc + (scores.values[moduleIndex]?.[sampleIndex] ?? 0),
        0,
      );
      const mean = sum / sampleIndices.length;
      return { gene, mean, moduleIndex };
    });

    return moduleScores
      .sort((a, b) => b.mean - a.mean)
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
    request: computed(() => {
      return {
        query: this._query$(),
        example: this.examplePrediction(),
      };
    }),
    loader: async (param) => {
      console.log('Recomputing _prediction$ request', param.request);
      const query = param.request.query;
      let prediction: PredictCancerType | undefined;
      if (!query) {
        console.log(
          'No query provided, returning undefined, setting example used',
        );
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

      console.log('Loaded prediction with UMAP', prediction);
      return prediction;
    },
  });

  readonly moduleNetworkData$ = resource<NetworkData | undefined, any>({
    request: computed(() => ({
      topModules: this.topModules$(),
      includeMembers: this.includeModuleMembers$(),
      dataset: this.selectedDataset$(),
      version: this.versionsService.versionReadOnly()(),
      level: this.level(),
      // Filters
      showOrphans: this.showOrphans$(),
      maxNodes: this.maxNodes$(),
      minDegree: this.minDegree$(),
      minBetweenness: this.minBetweenness$(),
      minEigen: this.minEigen$(),
      maxPValue: this.maxPValue$(),
      minMscor: this.minMscor$(),
    })),
    loader: async (param) => {
      const {
        topModules,
        includeMembers,
        dataset,
        version,
        level,
        showOrphans,
        maxNodes,
        minDegree,
        minBetweenness,
        minEigen,
        maxPValue,
        minMscor,
      } = param.request;
      if (topModules.length === 0 || !dataset || !version) return undefined;

      // Core gene list: always includes module centers
      const geneIDs = new Set<string>(
        topModules.map((m: { gene: string }) => m.gene),
      );

      if (includeMembers) {
        try {
          // Resolve module IDs with caching and concurrency limit
          const fetchModuleIdWithCache = async (gene: string): Promise<number | undefined> => {
            const cacheKey = `${gene}_${version}_${dataset.disease_name}_${level}`;
            if (this.moduleIDCache.has(cacheKey)) {
              return this.moduleIDCache.get(cacheKey);
            }

            let moduleId: number | undefined;
            if (level === 'gene') {
              const modules = await this.backend.getSpongEffectsGeneModules(
                version,
                dataset.disease_name,
                undefined,
                undefined,
                gene,
              );
              moduleId = modules[0]?.spongEffects_gene_module_ID;
            } else {
              const modules = await this.backend.getSpongEffectsTranscriptModules(
                version,
                dataset.disease_name,
                undefined,
                undefined,
                gene,
              );
              moduleId = modules[0]?.spongEffects_transcript_module_ID;
            }

            if (moduleId !== undefined) {
              this.moduleIDCache.set(cacheKey, moduleId);
            }
            return moduleId;
          };

          // Limit concurrency of module ID queries to 4
          const moduleIDs = (
            await this.runWithLimit(
              topModules.map((m: { gene: string }) => m.gene),
              4,
              fetchModuleIdWithCache
            )
          ).filter((id): id is number => id !== undefined);

          // Resolve module members with caching and concurrency limit
          const fetchMembersWithCache = async (id: number): Promise<any[]> => {
            const cacheKey = `${id}_${version}_${dataset.disease_name}_${level}`;
            if (this.moduleMembersCache.has(cacheKey)) {
              return this.moduleMembersCache.get(cacheKey)!;
            }

            const members = await (level === 'gene'
              ? this.backend.getSpongEffectsGeneModuleMembers(
                version,
                dataset.disease_name,
                undefined,
                undefined,
                undefined,
                id,
              )
              : this.backend.getSpongEffectsTranscriptModuleMembers(
                version,
                dataset.disease_name,
                undefined,
                undefined,
                undefined,
                id,
              ));

            this.moduleMembersCache.set(cacheKey, members);
            return members;
          };

          // Limit concurrency of member queries to 4
          const allMembers = await this.runWithLimit(
            moduleIDs,
            4,
            fetchMembersWithCache
          );

          allMembers
            .flat()
            .forEach(
              (m: {
                gene?: { ensg_number: string };
                transcript?: { enst_number: string };
              }) => {
                if (m.gene) {
                  geneIDs.add(m.gene.ensg_number);
                } else if (m.transcript) {
                  geneIDs.add(m.transcript.enst_number);
                }
              },
            );
        } catch (e) {
          console.error('Error fetching module members:', e);
        }
      }

      const identifiers = Array.from(geneIDs);

      try {
        // Fetch all interactions where ANY of the target genes is involved
        // Use the filter's maxPValue
        const interactions = await this.backend.getInteractionsSpecific(
          version,
          dataset,
          maxPValue,
          identifiers,
          level,
          maxNodes
        );

        // Apply client-side mscor filter
        let filteredInteractions = interactions.filter(
          (int: any) => int.mscor >= minMscor,
        );


        // Build synthetic node objects from interaction data (both gene- and transcript-level)
        const nodeMap = new Map<string, GeneNode | TranscriptNode>();
        filteredInteractions.forEach((int: any) => {
          if ('gene1' in int) {
            const add = (g: { ensg_number: string; gene_symbol?: string }) => {
              if (!nodeMap.has(g.ensg_number)) {
                nodeMap.set(g.ensg_number, {
                  gene: {
                    ensg_number: g.ensg_number,
                    gene_symbol: g.gene_symbol,
                  },
                  betweenness: 0,
                  eigenvector: 0,
                  node_degree: 0,
                  sponge_run: {
                    dataset: {
                      data_origin: '',
                      dataset_ID: dataset.dataset_ID,
                      disease_name: dataset.disease_name,
                      disease_subtype: '',
                    },
                    sponge_run_ID: 0,
                  },
                } as GeneNode);
              }
            };
            add(int.gene1);
            add(int.gene2);
          } else {
            // transcript-level interactions
            const add = (t: { enst_number: string; gene?: { ensg_number: string; gene_symbol?: string } }) => {
              if (!nodeMap.has(t.enst_number)) {
                nodeMap.set(t.enst_number, {
                  transcript: {
                    enst_number: t.enst_number,
                    gene: t.gene ?? { ensg_number: t.enst_number },
                  },
                  betweenness: 0,
                  eigenvector: 0,
                  node_degree: 0,
                  sponge_run: {
                    dataset: {
                      data_origin: '',
                      dataset_ID: dataset.dataset_ID,
                      disease_name: dataset.disease_name,
                      disease_subtype: '',
                    },
                    sponge_run_ID: 0,
                  },
                } as TranscriptNode);
              }
            };
            add(int.transcript_1);
            add(int.transcript_2);
          }
        });

        // Add orphan nodes: any identifier not covered by an interaction
        identifiers.forEach((id) => {
          if (!nodeMap.has(id)) {
            const isTranscript = level === 'transcript';
            nodeMap.set(id, isTranscript ? {
              transcript: { enst_number: id, gene: { ensg_number: id, gene_symbol: id } },
              betweenness: 0,
              eigenvector: 0,
              node_degree: 0,
              sponge_run: {
                dataset: {
                  data_origin: '',
                  dataset_ID: dataset.dataset_ID,
                  disease_name: dataset.disease_name,
                  disease_subtype: '',
                },
                sponge_run_ID: 0,
              },
            } as TranscriptNode : {
              gene: { ensg_number: id, gene_symbol: id },
              betweenness: 0,
              eigenvector: 0,
              node_degree: 0,
              sponge_run: {
                dataset: {
                  data_origin: '',
                  dataset_ID: dataset.dataset_ID,
                  disease_name: dataset.disease_name,
                  disease_subtype: '',
                },
                sponge_run_ID: 0,
              },
            } as GeneNode);
          }
        });

        // Apply client-side node filters
        let nodes = Array.from(nodeMap.values());

        // Update node degrees based on filtered interactions
        nodes.forEach((node) => {
          const id =
            'gene' in node
              ? node.gene.ensg_number
              : node.transcript.enst_number;
          node.node_degree = filteredInteractions.filter((int: any) => {
            if ('gene1' in int) {
              return (
                int.gene1.ensg_number === id || int.gene2.ensg_number === id
              );
            } else {
              return (
                int.transcript_1.enst_number === id ||
                int.transcript_2.enst_number === id
              );
            }
          }).length;
        });

        // Filter by minDegree
        nodes = nodes.filter((n) => n.node_degree >= minDegree);

        // Filter orphans if requested
        if (!showOrphans) {
          nodes = nodes.filter((n) => n.node_degree > 0);
        }

        // Limit to maxNodes, but always keep module center nodes (topModules gene IDs)
        const moduleCenterIDs = new Set(topModules.map((m: { gene: string }) => m.gene));
        const centerNodes = nodes.filter((n) => {
          const id = 'gene' in n ? n.gene.ensg_number : n.transcript.enst_number;
          return moduleCenterIDs.has(id);
        });
        const nonCenterNodes = nodes
          .filter((n) => {
            const id = 'gene' in n ? n.gene.ensg_number : n.transcript.enst_number;
            return !moduleCenterIDs.has(id);
          })
          .sort((a, b) => b.node_degree - a.node_degree)
          .slice(0, Math.max(0, maxNodes - centerNodes.length));
        nodes = [...centerNodes, ...nonCenterNodes];

        // Final edge filtering based on remaining nodes
        const finalNodeIDs = new Set(
          nodes.map((n) =>
            'gene' in n
              ? n.gene.ensg_number
              : n.transcript.enst_number,
          ),
        );
        const finalEdges = filteredInteractions.filter((int: any) => {
          if ('gene1' in int) {
            return (
              finalNodeIDs.has(int.gene1.ensg_number) &&
              finalNodeIDs.has(int.gene2.ensg_number)
            );
          } else {
            return (
              finalNodeIDs.has(int.transcript_1.enst_number) &&
              finalNodeIDs.has(int.transcript_2.enst_number)
            );
          }
        });

        return {
          nodes: nodes,
          inverseNodes: [],
          edges: finalEdges,
          disease: dataset,
        } as NetworkData;
      } catch (e) {
        console.error('Error fetching module network:', e);
        return undefined;
      }
    },
  });

  public get isLoading$() {
    return this._prediction$.isLoading;
  }

  public get prediction$() {
    return this._prediction$.value.asReadonly();
  }

  constructor() {
    effect(() => {
      const currentDataset = this.selectedReferenceDataset$();
      if (currentDataset?.disease_name) {
        untracked(() => {
          if (this.versionsService.selectedDiseaseName$() !== currentDataset.disease_name) {
            this.versionsService.selectedDiseaseName$.set(currentDataset.disease_name);
          }
        });
      }
    });
  }

  request(query: Query) {
    console.log('query', query);
    this._query$.set(query);
  }
}
