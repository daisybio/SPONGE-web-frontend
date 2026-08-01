import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  resource,
  ResourceRef,
  Signal,
  signal,
} from '@angular/core';
import {
  BrowseQuery,
  Dataset,
  Gene,
  GeneInteraction,
  GeneNode,
  NetworkResult,
  Transcript,
  TranscriptInteraction,
  TranscriptNode,
  NetworkData,
} from '../interfaces';
import { BackendService } from './backend.service';
import Graph from 'graphology';
import { VersionsService } from './versions.service';
import ForceSupervisor from 'graphology-layout-force/worker';
import { isEqual } from 'lodash';
import { Track } from '@visa-ge/ng-igv';

export enum State {
  Default,
  Hover,
  Active,
}

export interface EntityState {
  [State.Hover]: boolean;
  [State.Active]: boolean;
}

@Injectable({ providedIn: 'root' })
export class BrowseService {
  readonly physicsEnabled$ = signal(true);
  readonly lastClicked = signal<'node' | 'edge'>('node');
  readonly graph$ = computed(() =>
    this.createGraph(this.nodes$(), this.interactions$(), this.inverseNodes$())
  );

  // Use a plain class field (not a signal) to avoid a circular reactive dependency:
  // reading + writing the same signal inside an effect() causes an infinite loop.
  private _supervisor: ForceSupervisor | null = null;

  private readonly _query$ = signal<BrowseQuery | undefined>(undefined);
  private readonly _version$: Signal<number>;
  private readonly _comparisons$ = resource({
    params: computed(() => {
      return this._version$();
    }),
    loader: (param) => {
      return this.backend.getComparisons(param.params);
    },
  });
  private readonly _currentData$: ResourceRef<NetworkData | undefined>;
  private readonly _manualData$ = signal<NetworkData | undefined>(undefined);
  private readonly _effectiveData$ = computed(() => this._manualData$() ?? this._currentData$.value());
  readonly disease$ = computed(() => this._effectiveData$()?.disease);
  readonly possibleComparisons$ = computed(() => {
    const disease = this.disease$();
    const comparisons = this._comparisons$.value();
    if (disease === undefined || comparisons === undefined) return [];
    return comparisons
      .filter((c) => c.gene_transcript == this.level$())
      .filter(
        (c) =>
          c.dataset_1.dataset_ID === disease.dataset_ID ||
          c.dataset_2.dataset_ID === disease.dataset_ID
      );
  });
  readonly nodes$ = computed(() => this._effectiveData$()?.nodes || []);
  readonly inverseNodes$ = computed(
    () => this._effectiveData$()?.inverseNodes || []
  );
  readonly interactions$ = computed(
    () => this._effectiveData$()?.edges || []
  );
  private readonly _nodeStates$ = signal<Record<string, EntityState>>({});
  activeNodes$ = computed(() => {
    const activeNodeIDs = Object.entries(this._nodeStates$())
      .filter(([_, state]) => state[State.Active])
      .map(([node, _]) => node);
    return this.nodes$().filter((node) =>
      activeNodeIDs.includes(BrowseService.getNodeID(node))
    );
  });
  private readonly _edgeStates$ = signal<Record<string, EntityState>>({});
  activeInteractions$ = computed(() => {
    const activeEdgeIDs = Object.entries(this._edgeStates$())
      .filter(([_, state]) => state[State.Active])
      .map(([edge, _]) => edge);
    return activeEdgeIDs
      .map((edgeID) =>
        this.getInteractionForEdge(edgeID, this.interactions$(), this.graph$())
      )
      .flat()
      .filter((interaction) => interaction !== undefined);
  });
  private readonly _networkResults$ = resource({
    params: computed(() => {
      return {
        version: this._version$(),
        level: this.level$(),
      };
    }),
    loader: (param) => {
      return this.backend.getNetworkResults(
        param.params.version,
        param.params.level
      );
    },
  });

  constructor(
    protected backend: BackendService,
    versionsService: VersionsService
  ) {
    this._version$ = versionsService.versionReadOnly();
    const destroyRef = inject(DestroyRef);

    this._currentData$ = resource({
      params: computed(() => {
        return {
          version: this._version$(),
          config: this._query$(),
        };
      }),
      loader: (param) =>
        this.fetchData(param.params.version, param.params.config),
    });

    effect(() => {
      const graph = this.graph$();
      const initialState: EntityState = {
        [State.Hover]: false,
        [State.Active]: false,
      };
      this._nodeStates$.set(
        Object.fromEntries(graph.nodes().map((node: string) => [node, initialState]))
      );
      this._edgeStates$.set(
        Object.fromEntries(graph.edges().map((edge: string) => [edge, initialState]))
      );
    });

    // Manage ForceSupervisor lifecycle: stop old supervisor, create new one, start if physics enabled
    effect(() => {
      const graph = this.graph$();
      const physicsEnabled = this.physicsEnabled$();

      // Stop and clean up old supervisor (plain field — no reactive dependency)
      if (this._supervisor) {
        this._supervisor.stop();
        this._supervisor.kill();
      }

      const newSupervisor = new ForceSupervisor(graph, {
        isNodeFixed: (_: any, attr: any) => attr['highlighted'],
        settings: {
          repulsion: 0.001,
          attraction: 0.01,
          gravity: 0.001,
        },
      });

      this._supervisor = newSupervisor;

      if (physicsEnabled) {
        newSupervisor.start();
      }
    });

    // Kill supervisor when service is destroyed
    destroyRef.onDestroy(() => {
      if (this._supervisor) {
        this._supervisor.stop();
        this._supervisor.kill();
      }
    });
  }

  readonly level$ = computed(() => this._query$()?.level);
  readonly rawDataURL$ = computed(() => this._query$()?.dataset?.download_url);

  get nodeStates$(): Signal<Record<string, EntityState>> {
    return this._nodeStates$.asReadonly();
  }

  get edgeStates$(): Signal<Record<string, EntityState>> {
    return this._edgeStates$.asReadonly();
  }

  get isLoading$(): Signal<boolean> {
    return this._currentData$.isLoading;
  }

  get networkResults$(): Signal<NetworkResult | undefined> {
    return this._networkResults$.value.asReadonly();
  }

  public static getNodeID(node: GeneNode | TranscriptNode): string {
    return 'gene' in node ? node.gene.ensg_number : node.transcript.enst_number;
  }

  public static getNodeGeneName(node: GeneNode | TranscriptNode): string {
    return BrowseService.getGeneName(BrowseService.getNodeObject(node));
  }

  public static getNodeFullName(node: GeneNode | TranscriptNode): string {
    return BrowseService.getFullName(BrowseService.getNodeObject(node));
  }

  public static getNodeObject(
    node: GeneNode | TranscriptNode
  ): Gene | Transcript {
    return 'gene' in node ? node.gene : node.transcript;
  }

  public static getInteractionIDs(
    interaction: GeneInteraction | TranscriptInteraction
  ): [string, string] {
    const objects = BrowseService.getInteractionObjects(interaction);
    return objects.map(BrowseService.getID) as [string, string];
  }

  public static getInteractionFullNames(
    interaction: GeneInteraction | TranscriptInteraction
  ): [string, string] {
    const objects = BrowseService.getInteractionObjects(interaction);
    return objects.map(BrowseService.getFullName) as [string, string];
  }

  public static getInteractionGeneNames(
    interaction: GeneInteraction | TranscriptInteraction
  ): [string, string] {
    const objects = BrowseService.getInteractionObjects(interaction);
    return objects.map(BrowseService.getGeneName) as [string, string];
  }

  /**
   * Build a synthetic "fallback" edge between a module center and a member the DB has no real
   * ceRNA edge for. SpongEffects module members are first-neighbours of the center in the
   * analysis/training network, but the DB `GeneInteraction` table may lack the edge — so the
   * network still shows a center<->member edge. These carry no real metrics and render thin
   * (see createGraph's `isVirtual` handling). Shared by the patient-specific and Explore networks.
   */
  protected createVirtualEdge(center: string, member: string, level: 'gene' | 'transcript', dataset: Dataset, centerSymbol?: string, memberSymbol?: string): any {
    const spongeRun = {
      dataset: { data_origin: '', dataset_ID: dataset.dataset_ID, disease_name: dataset.disease_name, disease_subtype: '' },
      sponge_run_ID: 0,
    };
    const cSym = centerSymbol || center;
    const mSym = memberSymbol || member;
    if (level === 'gene') {
      return {
        correlation: '(abs) > 0.1',
        mscor: '< 0.2',
        p_value: '> 0.2',
        isVirtual: true,
        gene1: { ensg_number: center, gene_symbol: cSym, gene_type: 'unknown' },
        gene2: { ensg_number: member, gene_symbol: mSym, gene_type: 'unknown' },
        sponge_run: spongeRun
      } as any;
    } else {
      return {
        correlation: '(abs) > 0.1',
        mscor: '< 0.2',
        p_value: '> 0.2',
        isVirtual: true,
        transcript_1: { enst_number: center, gene: { ensg_number: center, gene_symbol: cSym, gene_type: 'unknown' }, transcript_type: 'unknown' },
        transcript_2: { enst_number: member, gene: { ensg_number: member, gene_symbol: mSym, gene_type: 'unknown' }, transcript_type: 'unknown' },
        sponge_run: spongeRun
      } as any;
    }
  }

  public static getInteractionObjects(
    interaction: GeneInteraction | TranscriptInteraction
  ): [Gene, Gene] | [Transcript, Transcript] {
    return 'gene1' in interaction
      ? [interaction.gene1, interaction.gene2]
      : [interaction.transcript_1, interaction.transcript_2];
  }

  public static getFullName(node: Gene | Transcript): string {
    if ('ensg_number' in node) {
      return node.gene_symbol || node.ensg_number;
    } else {
      return `${node.gene.gene_symbol || node.gene.ensg_number} (${node.enst_number
        })`;
    }
  }

  public static getGProfilerUrlForNodes(
    nodes: (GeneNode | TranscriptNode)[]
  ): string {
    const genes = nodes
      .map((node) => {
        if ('gene' in node) {
          return node.gene;
        } else {
          return node.transcript.gene;
        }
      })
      .map((gene) => gene.gene_symbol || gene.ensg_number);

    return `https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query=${genes.join(
      ' '
    )}`;
  }

  private static getID(node: Gene | Transcript): string {
    return 'ensg_number' in node ? node.ensg_number : node.enst_number;
  }

  private static getGeneName(node: Gene | Transcript): string {
    return 'ensg_number' in node
      ? node.gene_symbol || node.ensg_number
      : node.gene.gene_symbol || node.gene.ensg_number;
  }

  runQuery(query: BrowseQuery) {
    this._manualData$.set(undefined); // clear manual override when running a new query
    this._query$.set(query);
  }

  setManualData(data: NetworkData | undefined) {
    this._manualData$.set(data);
  }

  getQuery(): BrowseQuery | undefined {
    return this._query$();
  }

  rawDataURL() {
    return this.rawDataURL$;
  }

  async fetchData(
    version: number,
    config: BrowseQuery | undefined
  ): Promise<NetworkData> {
    if (config === undefined) {
      return {
        nodes: [],
        inverseNodes: [],
        edges: [],
        disease: undefined,
      };
    }

    const inverseConfig = {
      ...config,
      level:
        config.level === 'gene'
          ? 'transcript'
          : ('gene' as 'gene' | 'transcript'),
    };

    const inverseNodes$ = this.backend
      .getNetwork(version, inverseConfig)
      .then((network) => network.nodes);
    let { nodes, edges } = await this.backend.getNetwork(version, config);
    const inverseNodes = await inverseNodes$;

    if (config.geneType && config.geneType !== 'all') {
      const targetType = config.geneType.toLowerCase();
      nodes = nodes.filter((node) => {
        let nType = '';
        if ('gene' in node && node.gene?.gene_type) nType = node.gene.gene_type;
        else if ('transcript' in node && node.transcript?.transcript_type) nType = node.transcript.transcript_type;
        else if ('transcript' in node && node.transcript?.gene?.gene_type) nType = node.transcript.gene.gene_type;
        return nType.toLowerCase() === targetType;
      });
    }

    if (config.supportFilter && config.supportFilter !== 'all') {
      const inverseNodeGeneNames = new Set(inverseNodes.map(BrowseService.getNodeGeneName));
      nodes = nodes.filter((node) => {
        const gene = BrowseService.getNodeGeneName(node);
        const hasInverse = inverseNodes.length > 0
          ? inverseNodeGeneNames.has(gene)
          : (node.has_inverse ?? false);
        return config.supportFilter === 'has_inverse' ? hasInverse : !hasInverse;
      });
    }

    const keptNodeIDs = new Set(nodes.map((n) => BrowseService.getNodeID(n)));
    edges = edges.filter((int) => {
      const ids = BrowseService.getInteractionIDs(int);
      return keptNodeIDs.has(ids[0]) && keptNodeIDs.has(ids[1]);
    });

    if (!config.showOrphans) {
      const interactionNodes = edges
        .map((interaction) => BrowseService.getInteractionIDs(interaction))
        .flat();
      nodes = nodes.filter((node) => {
        const nodeObject = BrowseService.getNodeID(node);
        return interactionNodes.some((interactionObject) =>
          isEqual(interactionObject, nodeObject)
        );
      });
    }

    return {
      nodes,
      inverseNodes,
      edges,
      disease: config.dataset,
    };
  }

  toggleState(
    id: string,
    entityType: 'node' | 'edge',
    state: State.Active | State.Hover
  ) {
    const states =
      entityType === 'node' ? this._nodeStates$ : this._edgeStates$;
    this.lastClicked.set(entityType);
    states.update((entityStates) => {
      return {
        ...entityStates,
        [id]: {
          ...entityStates[id],
          [state]: !entityStates[id][state],
        },
      };
    });
  }

  setState(
    id: string,
    entityType: 'node' | 'edge',
    state: State,
    value: boolean
  ) {
    const states =
      entityType === 'node' ? this._nodeStates$ : this._edgeStates$;
    states.update((entityStates) => {
      return {
        ...entityStates,
        [id]: {
          ...entityStates[id],
          [state]: value,
        },
      };
    });
  }

  getInteractionForEdge(
    edgeID: string,
    interactions: (GeneInteraction | TranscriptInteraction)[],
    graph: Graph
  ): (GeneInteraction | TranscriptInteraction)[] {
    const source = graph.source(edgeID);
    const target = graph.target(edgeID);
    return interactions.filter((interaction) => {
      const ids = BrowseService.getInteractionIDs(interaction);
      return (
        (ids[0] === source && ids[1] === target) ||
        (ids[0] === target && ids[1] === source)
      );
    });
  }

  getMiRNATracksForNode(
    node: Gene | Transcript
  ): ResourceRef<Track[] | undefined> {
    const nodeId = BrowseService.getID(node);
    const level = 'ensg_number' in node ? 'gene' : 'transcript';

    return resource({
      params: computed(() => {
        return {
          interactions: this.interactions$(),
          disease: this.disease$(),
          version: this._version$(),
        };
      }),
      loader: async (param) => {
        const disease = param.params.disease;
        if (!disease) {
          return [];
        }

        const interactions = param.params.interactions.filter(
          (interaction) => {
            return BrowseService.getInteractionIDs(interaction).some(
              (interactionID) => interactionID == nodeId
            );
          }
        );

        const miRNAs$ = interactions.map((edge) =>
          this.backend
            .getMiRNAs(
              param.params.version,
              disease,
              BrowseService.getInteractionIDs(edge),
              level
            )
            .then((res) => res.map((mirna) => mirna.mirna.hs_nr))
        );
        const uniqueMiRNAs = (await Promise.all(miRNAs$))
          .flat()
          .filter((miRNA, i, arr) => arr.indexOf(miRNA) === i);
        const tracks = uniqueMiRNAs.map((miRNA): Track => {
          return {
            name: miRNA,
            url: `https://exbio.wzw.tum.de/sponge-files/miRNA_bed_files/${miRNA}.bed.gz`,
            indexURL: `https://exbio.wzw.tum.de/sponge-files/miRNA_bed_files/${miRNA}.bed.gz.tbi`,
            format: 'bed',
            type: 'annotation',
            height: 30,
            displayMode: 'SQUISHED',
            indexed: false,
          };
        });

        const refSeqTrack: any = {
          name: 'RefSeq Transcripts',
          format: 'refgene',
          url: 'https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.txt.gz',
          indexed: false,
          nameField: 'name',
          displayMode: 'EXPANDED',
          height: 100,
        };
        tracks.push(refSeqTrack as Track);

        return tracks;
      },
    });
  }

  private createGraph(
    nodes: (GeneNode | TranscriptNode)[],
    interactions: (GeneInteraction | TranscriptInteraction)[],
    inverseNodes: (GeneNode | TranscriptNode)[]
  ): Graph {
    const graph = new Graph();

    // Find max node degree for normalization. Guard against 0/NaN (e.g. nodes fetched without
    // network-analysis metrics) so node sizes don't become NaN.
    const maxNodeDegree = Math.max(1, ...nodes.map((node) => node.node_degree || 0));

    // Helper to safely parse mscor as numeric value (virtual edges have string '< 0.2', fallback to 0.1)
    const getNumericMscor = (int: GeneInteraction | TranscriptInteraction): number => {
      if (typeof int.mscor === 'number') return int.mscor;
      const parsed = parseFloat(String(int.mscor).replace(/[^0-9.]/g, ''));
      return isNaN(parsed) || parsed === 0 ? 0.1 : parsed;
    };

    // Find max mscor for normalization (guard against 0/NaN). Fallback (virtual) edges carry no
    // real mscor, so they are excluded — they must not skew the real edges' thickness scale.
    const maxMscor = Math.max(
      0.1,
      ...interactions.filter((i) => !(i as any).isVirtual).map(getNumericMscor)
    );

    const inverseNodeGeneNames = new Set(inverseNodes.map(BrowseService.getNodeGeneName));

    nodes.forEach((node) => {
      const gene = BrowseService.getNodeGeneName(node);
      const hasInverse = inverseNodes.length > 0
        ? inverseNodeGeneNames.has(gene)
        : (node.has_inverse ?? false);

      // Calculate normalized node size based on degree (range: 5-20)
      const baseSize = 5 + 15 * ((node.node_degree || 0) / maxNodeDegree);
      const normalizedSize = baseSize;

      let nodeType = 'unknown';
      if ('gene' in node && node.gene.gene_type) {
        nodeType = node.gene.gene_type;
      } else if ('transcript' in node && node.transcript.transcript_type) {
        nodeType = node.transcript.transcript_type;
      }

      graph.addNode(BrowseService.getNodeID(node), {
        label: BrowseService.getNodeFullName(node),
        x: Math.random(), // Coordinates will be overridden by the layout algorithm
        y: Math.random(),
        size: normalizedSize,
        forceLabel: true,
        // Module centers get a green frame (borderedCircle if hasInverse, borderedSquare if !hasInverse)
        type: node.isCenter
          ? (hasInverse ? 'borderedCircle' : 'borderedSquare')
          : (hasInverse ? 'circle' : 'square'),
        nodeType: nodeType,
        isCenter: !!node.isCenter,
      });
    });

    interactions.forEach((interaction) => {
      const ids = BrowseService.getInteractionIDs(interaction);
      if (graph.hasEdge(ids[0], ids[1])) {
        return;
      }

      // Fallback (virtual) edges have no measured interaction — draw them very thin so they read
      // as "module membership only".
      if ((interaction as any).isVirtual) {
        graph.addEdge(ids[0], ids[1], {
          size: 0.4,
        });
        return;
      }

      // Calculate normalized edge size based on mscor (range: 1-6)
      const numericMscor = getNumericMscor(interaction);
      const normalizedSize = 1 + 5 * (numericMscor / maxMscor);

      graph.addEdge(ids[0], ids[1], {
        size: normalizedSize,
      });
    });

    return graph;
  }

  setAllNodesState(state: boolean) {
    this._nodeStates$.update((entityStates) => {
      return Object.fromEntries(
        Object.keys(entityStates).map((key) => [
          key,
          {
            ...entityStates[key],
            [State.Active]: state,
          },
        ])
      );
    });
  }

  allNodesSelected$ = computed(() => {
    return Object.values(this._nodeStates$()).every(
      (state) => state[State.Active]
    );
  });

  setAllEdgesState(state: boolean) {
    this._edgeStates$.update((entityStates) => {
      return Object.fromEntries(
        Object.keys(entityStates).map((key) => [
          key,
          {
            ...entityStates[key],
            [State.Active]: state,
          },
        ])
      );
    });
  }

  allEdgesSelected$ = computed(() => {
    return Object.values(this._edgeStates$()).every(
      (state) => state[State.Active]
    );
  });
}
