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
} from '@angular/core';
import { BackendService } from '../../../../services/backend.service';
import {
  NetworkData,
  PredictCancerType,
  GeneNode,
  GeneInteraction,
  Dataset,
  BrowseQuery,
  InteractionSorting,
} from '../../../../interfaces';
import { EXAMPLE_PREDICTION_URL } from '../../../../constants';
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
  private readonly _query$ = signal<Query | undefined>(undefined);
  _subtypes$ = signal<boolean>(false);
  example_used = signal<boolean>(false);
  level = signal<'gene' | 'transcript'>('gene');

  readonly selectedSamples$ = signal<string[]>([]);
  readonly includeModuleMembers$ = signal<boolean>(false);

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

  examplePrediction = (async () => {
    const response = await fetch(EXAMPLE_PREDICTION_URL);
    const prediction = await response.json();
    return prediction;
  })();

  readonly _prediction$: ResourceRef<PredictCancerType> = resource({
    request: computed(() => {
      return {
        query: this._query$(),
        example: this.examplePrediction,
      };
    }),
    loader: async (param) => {
      console.log('Recomputing _prediction$ request', param.request);
      const query = param.request.query;
      if (!query) {
        console.log(
          'No query provided, returning undefined, setting example used',
        );
        const example = await this.examplePrediction;
        this.example_used.set(true);
        return example;
      }
      if (!query.useExampleExpression) {
        this.example_used.set(false);
      }
      const prediction = await this.backend.predictCancerType(
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
      console.log('Loaded prediction', prediction);
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
          const fetchModule = async (gene: string) => {
            if (level === 'gene') {
              const modules = await this.backend.getSpongEffectsGeneModules(
                version,
                dataset.disease_name,
                undefined,
                undefined,
                gene,
              );
              return modules[0]?.spongEffects_gene_module_ID;
            } else {
              const modules =
                await this.backend.getSpongEffectsTranscriptModules(
                  version,
                  dataset.disease_name,
                  undefined,
                  undefined,
                  gene,
                );
              return modules[0]?.spongEffects_transcript_module_ID;
            }
          };
          const moduleIDs = (
            await Promise.all(
              topModules.map((m: { gene: string }) => fetchModule(m.gene)),
            )
          ).filter(Boolean);
          const allMembers = await Promise.all(
            moduleIDs.map((id) =>
              level === 'gene'
                ? this.backend.getSpongEffectsGeneModuleMembers(
                    version,
                    dataset.disease_name,
                    undefined,
                    undefined,
                    undefined,
                    id as number,
                  )
                : this.backend.getSpongEffectsTranscriptModuleMembers(
                    version,
                    dataset.disease_name,
                    undefined,
                    undefined,
                    undefined,
                    id as number,
                  ),
            ),
          );
          allMembers
            .flat()
            .forEach(
              (m: {
                gene?: { ensg_number: string };
                transcript?: { enst_number: string };
              }) => {
                geneIDs.add(
                  'gene' in m ? m.gene!.ensg_number : m.transcript!.enst_number,
                );
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
        );

        // Apply client-side mscor filter
        let filteredInteractions = interactions.filter(
          (int: any) => int.mscor >= minMscor,
        );

        // Collect all node IDs from interactions
        const nodeIDsInEdges = new Set<string>();
        filteredInteractions.forEach((int: any) => {
          if ('gene1' in int) {
            nodeIDsInEdges.add(int.gene1.ensg_number);
            nodeIDsInEdges.add(int.gene2.ensg_number);
          } else {
            nodeIDsInEdges.add(int.transcript_1.enst_number);
            nodeIDsInEdges.add(int.transcript_2.enst_number);
          }
        });

        // Also include orphan module centers (no interactions found)
        identifiers.forEach((id) => nodeIDsInEdges.add(id));

        // Build synthetic GeneNode objects from interaction data
        const nodeMap = new Map<string, GeneNode>();
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
          }
        });

        // Add orphan nodes (module centers with no edges)
        identifiers.forEach((id) => {
          if (!nodeMap.has(id)) {
            nodeMap.set(id, {
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
              : (node as any).transcript.enst_number;
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

        // Limit to maxNodes (sort by degree for now as centrality is 0)
        nodes = nodes
          .sort((a, b) => b.node_degree - a.node_degree)
          .slice(0, maxNodes);

        // Final edge filtering based on remaining nodes
        const finalNodeIDs = new Set(
          nodes.map((n) =>
            'gene' in n
              ? n.gene.ensg_number
              : (n as any).transcript.enst_number,
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

  constructor() {}

  request(query: Query) {
    console.log('query', query);
    this._query$.set(query);
  }
}
