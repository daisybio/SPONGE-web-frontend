import {computed, effect, Injectable, resource, ResourceRef, Signal, signal} from '@angular/core';
import {
  BrowseQuery,
  Dataset,
  Gene,
  GeneInteraction,
  GeneNode,
  Transcript,
  TranscriptInteraction,
  TranscriptNode
} from "../interfaces";
import {BackendService} from "./backend.service";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import {VersionsService} from "./versions.service";

export enum State {
  Default,
  Hover,
  Active
}

export interface EntityState {
  [State.Hover]: boolean;
  [State.Active]: boolean;
}

interface NetworkData {
  nodes: (GeneNode | TranscriptNode)[],
  interactions: (GeneInteraction | TranscriptInteraction)[],
  disease: Dataset | undefined
}

@Injectable({
  providedIn: 'root'
})
export class BrowseService {
  readonly graph$ = computed(() => this.createGraph(this.nodes$(), this.interactions$()));
  private readonly _query$ = signal<BrowseQuery | undefined>(undefined);
  private readonly _version$: Signal<number>;
  private readonly _currentData$: ResourceRef<NetworkData>;
  readonly disease$ = computed(() => this._currentData$.value()?.disease);
  readonly nodes$ = computed(() => this._currentData$.value()?.nodes || []);
  readonly interactions$ = computed(() => this._currentData$.value()?.interactions || []);
  private readonly _nodeStates$ = signal<Record<string, EntityState>>({});
  activeNodes$ = computed(() => {
    const activeNodeIDs = Object.entries(this._nodeStates$()).filter(([_, state]) => state[State.Active]).map(([node, _]) => node);
    return this.nodes$().filter(node => activeNodeIDs.includes(BrowseService.getNodeID(node)));
  });
  private readonly _edgeStates$ = signal<Record<string, EntityState>>({});
  activeInteractions$ = computed(() => {
    const activeEdgeIDs = Object.entries(this._edgeStates$()).filter(([_, state]) => state[State.Active]).map(([edge, _]) => edge);
    return activeEdgeIDs.map(edgeID => this.getInteractionForEdge(edgeID, this.interactions$(), this.graph$())).flat().filter(interaction => interaction !== undefined) as GeneInteraction[];
  })

  constructor(private backend: BackendService, versionsService: VersionsService) {
    this._version$ = versionsService.versionReadOnly();

    const requestData = computed(() => {
      return {
        version: this._version$(),
        config: this._query$()
      }
    })

    this._currentData$ = resource({
      request: requestData,
      loader: (param) => this.fetchData(param.request.version, param.request.config),
    })

    effect(() => {
      const graph = this.graph$();
      const initialState: EntityState = {[State.Hover]: false, [State.Active]: false};
      this._nodeStates$.set(Object.fromEntries(graph.nodes().map(node => [node, initialState])));
      this._edgeStates$.set(Object.fromEntries(graph.edges().map(edge => [edge, initialState])));
    });
  }

  get nodeStates$(): Signal<Record<string, EntityState>> {
    return this._nodeStates$.asReadonly();
  }

  get edgeStates$(): Signal<Record<string, EntityState>> {
    return this._edgeStates$.asReadonly();
  }

  get isLoading$(): Signal<boolean> {
    return this._currentData$.isLoading;
  }

  get level$(): Signal<'gene' | 'transcript' | undefined> {
    return computed(() => this._query$()?.level);
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

  public static getNodeObject(node: GeneNode | TranscriptNode): Gene | Transcript {
    return 'gene' in node ? node.gene : node.transcript;
  }

  public static getInteractionIDs(interaction: GeneInteraction | TranscriptInteraction): [string, string] {
    const objects = BrowseService.getInteractionObjects(interaction);
    return objects.map(BrowseService.getID) as [string, string];
  }

  public static getInteractionFullNames(interaction: GeneInteraction | TranscriptInteraction): [string, string] {
    const objects = BrowseService.getInteractionObjects(interaction);
    return objects.map(BrowseService.getFullName) as [string, string];
  }

  public static getInteractionGeneNames(interaction: GeneInteraction | TranscriptInteraction): [string, string] {
    const objects = BrowseService.getInteractionObjects(interaction);
    return objects.map(BrowseService.getGeneName) as [string, string];
  }

  public static getInteractionObjects(interaction: GeneInteraction | TranscriptInteraction): [Gene, Gene] | [Transcript, Transcript] {
    return 'gene1' in interaction ?
      [interaction.gene1, interaction.gene2] :
      [interaction.transcript_1, interaction.transcript_2];
  }

  public static getFullName(node: Gene | Transcript): string {
    if ('ensg_number' in node) {
      return node.gene_symbol || node.ensg_number;
    } else {
      return `${node.gene.gene_symbol || node.gene.ensg_number} (${node.enst_number})`;
    }
  }

  private static getID(node: Gene | Transcript): string {
    return 'ensg_number' in node ? node.ensg_number : node.enst_number;
  }

  private static getGeneName(node: Gene | Transcript): string {
    return 'ensg_number' in node ? node.gene_symbol || node.ensg_number : node.gene.gene_symbol || node.gene.ensg_number;
  }

  runQuery(query: BrowseQuery) {
    this._query$.set(query);
  }

  rawDataURL() {
    return computed(() => this._query$()?.dataset?.download_url);
  }

  async fetchData(version: number, config: BrowseQuery | undefined): Promise<NetworkData> {
    if (config === undefined) {
      return {
        nodes: [],
        interactions: [],
        disease: undefined
      }
    }

    const nodes = await this.backend.getNodes(version, config);
    // Get gene IDs or transcript IDs respectively
    const identifiers = nodes.map(node => 'gene' in node ? node.gene.ensg_number : node.transcript.enst_number);
    const interactions =
      await this.backend.getInteractionsSpecific(version, config.dataset, config.maxPValue, identifiers, config.level);

    return {
      nodes,
      interactions,
      disease: config.dataset
    }
  }

  createGraph(nodes: (GeneNode | TranscriptNode)[], interactions: (GeneInteraction | TranscriptInteraction)[]): Graph {
    const graph = new Graph();

    nodes.forEach(node => {
      graph.addNode(BrowseService.getNodeID(node), {
        label: BrowseService.getNodeFullName(node),
        x: Math.random(), // Coordinates will be overridden by the layout algorithm
        y: Math.random(),
        size: Math.log(node.node_degree)
      });
    });

    interactions.forEach(interaction => {
      const ids = BrowseService.getInteractionIDs(interaction);
      if (graph.hasEdge(ids[0], ids[1])) {
        return;
      }
      graph.addEdge(ids[0], ids[1]);
    });

    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: forceAtlas2.inferSettings(graph)
    });

    return graph;
  }

  toggleState(id: string, entityType: "node" | "edge", state: State.Active | State.Hover) {
    const states = entityType === "node" ? this._nodeStates$ : this._edgeStates$;
    states.update(entityStates => {
      return {
        ...entityStates,
        [id]: {
          ...entityStates[id],
          [state]: !entityStates[id][state]
        }
      }
    });
  }

  setState(id: string, entityType: "node" | "edge", state: State, value: boolean) {
    const states = entityType === "node" ? this._nodeStates$ : this._edgeStates$;
    states.update(entityStates => {
      return {
        ...entityStates,
        [id]: {
          ...entityStates[id],
          [state]: value
        }
      }
    });
  }

  getInteractionForEdge(edgeID: string, interactions: (GeneInteraction | TranscriptInteraction)[], graph: Graph): (GeneInteraction | TranscriptInteraction)[] {
    const source = graph.source(edgeID);
    const target = graph.target(edgeID);
    return interactions.filter(interaction => {
      const ids = BrowseService.getInteractionIDs(interaction);
      return (ids[0] === source && ids[1] === target) ||
        (ids[0] === target && ids[1] === source);
    });
  }
}
