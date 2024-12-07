import {computed, effect, Injectable, resource, ResourceRef, Signal, signal} from '@angular/core';
import {CeRNA, CeRNAInteraction, CeRNAQuery, Dataset} from "../interfaces";
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

@Injectable({
  providedIn: 'root'
})
export class BrowseService {
  readonly graph$ = computed(() => this.createGraph(this.ceRNAs$(), this.interactions$()));
  private readonly _query$ = signal<CeRNAQuery | undefined>(undefined);
  private readonly _version$: Signal<number>;
  private readonly _currentData$: ResourceRef<{
    ceRNAs: CeRNA[],
    interactions: CeRNAInteraction[],
    disease: Dataset | undefined
  }>;
  readonly disease$ = computed(() => this._currentData$.value()?.disease);
  readonly ceRNAs$ = computed(() => this._currentData$.value()?.ceRNAs || []);
  readonly interactions$ = computed(() => this._currentData$.value()?.interactions || []);
  private readonly _nodeStates$ = signal<Record<string, EntityState>>({});
  activeCeRNAs$ = computed(() => {
    const activeNodeIDs = Object.entries(this._nodeStates$()).filter(([_, state]) => state[State.Active]).map(([node, _]) => node);
    return this.ceRNAs$().filter(ceRNA => activeNodeIDs.includes(ceRNA.gene.ensg_number));
  });
  private readonly _edgeStates$ = signal<Record<string, EntityState>>({});
  activeInteractions$ = computed(() => {
    const activeEdgeIDs = Object.entries(this._edgeStates$()).filter(([_, state]) => state[State.Active]).map(([edge, _]) => edge);
    return activeEdgeIDs.map(edgeID => this.getInteractionForEdge(edgeID, this.interactions$(), this.graph$())).filter(interaction => interaction !== undefined) as CeRNAInteraction[];
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

  private _isLoading$ = signal<boolean>(false);

  get isLoading$(): Signal<boolean> {
    return this._isLoading$.asReadonly();
  }

  runQuery(query: CeRNAQuery) {
    this._query$.set(query);
  }

  async fetchData(version: number, config: CeRNAQuery | undefined): Promise<{
    ceRNAs: CeRNA[],
    interactions: CeRNAInteraction[],
    disease: Dataset | undefined
  }> {
    if (config === undefined) {
      return {
        ceRNAs: [],
        interactions: [],
        disease: undefined
      }
    }

    const ceRNA$ = this.backend.getCeRNA(version, config);
    // const runInfo$ = this.backend.getDatasetInfo(version, config.disease.disease_name);
    const ensgs$ = ceRNA$.then(ceRNAs => ceRNAs.map(ceRNA => ceRNA.gene.ensg_number));
    const interactions$ = ensgs$.then(async (ensgs) =>
      await this.backend.getCeRNAInteractionsSpecific(version, config.disease.disease_name, config.maxPValue, ensgs));

    const [ceRNAs, interactions] = await Promise.all([ceRNA$, interactions$]);

    return {
      ceRNAs,
      interactions,
      disease: config.disease
    }
  }

  createGraph(ceRNAs: CeRNA[], interactions: CeRNAInteraction[]): Graph {
    const graph = new Graph();

    ceRNAs.forEach(ceRNA => {
      graph.addNode(ceRNA.gene.ensg_number, {
        label: ceRNA.gene.gene_symbol || ceRNA.gene.ensg_number,
        x: Math.random(), // Coordinates will be overridden by the layout algorithm
        y: Math.random(),
        size: Math.log(ceRNA.node_degree)
      });
    });

    interactions.forEach(interaction => {
      graph.addEdge(interaction.gene1.ensg_number, interaction.gene2.ensg_number);
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

  getInteractionForEdge(edgeID: string, interactions: CeRNAInteraction[], graph: Graph): CeRNAInteraction | undefined {
    const source = graph.source(edgeID);
    const target = graph.target(edgeID);
    return interactions.find(interaction => {
      return (interaction.gene1.ensg_number === source && interaction.gene2.ensg_number === target) ||
        (interaction.gene1.ensg_number === target && interaction.gene2.ensg_number === source);
    });
  }
}
