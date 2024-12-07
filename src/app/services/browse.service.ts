import {computed, effect, Injectable, Signal, signal} from '@angular/core';
import {CeRNA, CeRNAInteraction, CeRNAQuery, Dataset} from "../interfaces";
import {BackendService} from "./backend.service";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

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
  graph$ = computed(() => this.createGraph(this.ceRNAs$(), this.interactions$()));
  activeCeRNAs$: Signal<CeRNA[]>;
  activeInteractions$: Signal<CeRNAInteraction[]>;
  private readonly _disease$ = signal<Dataset | undefined>(undefined);
  private readonly _ceRNAs$ = signal<CeRNA[]>([]);
  private readonly _interactions$ = signal<CeRNAInteraction[]>([]);
  private readonly _nodeStates$ = signal<Record<string, EntityState>>({});
  private readonly _edgeStates$ = signal<Record<string, EntityState>>({});

  constructor(private backend: BackendService) {
    effect(() => {
      const graph = this.graph$();
      const initialState: EntityState = {[State.Hover]: false, [State.Active]: false};
      this._nodeStates$.set(Object.fromEntries(graph.nodes().map(node => [node, initialState])));
      this._edgeStates$.set(Object.fromEntries(graph.edges().map(edge => [edge, initialState])));
    });

    this.activeCeRNAs$ = computed(() => {
      const activeNodeIDs = Object.entries(this._nodeStates$()).filter(([_, state]) => state[State.Active]).map(([node, _]) => node);
      return this.ceRNAs$().filter(ceRNA => activeNodeIDs.includes(ceRNA.gene.ensg_number));
    });

    this.activeInteractions$ = computed(() => {
      const activeEdgeIDs = Object.entries(this._edgeStates$()).filter(([_, state]) => state[State.Active]).map(([edge, _]) => edge);
      return activeEdgeIDs.map(edgeID => this.getInteractionForEdge(edgeID, this.interactions$(), this.graph$())).filter(interaction => interaction !== undefined) as CeRNAInteraction[];
    });
  }

  get ceRNAs$(): Signal<CeRNA[]> {
    return this._ceRNAs$.asReadonly();
  }

  get interactions$(): Signal<CeRNAInteraction[]> {
    return this._interactions$.asReadonly();
  }

  get nodeStates$(): Signal<Record<string, EntityState>> {
    return this._nodeStates$.asReadonly();
  }

  get edgeStates$(): Signal<Record<string, EntityState>> {
    return this._edgeStates$.asReadonly();
  }

  get disease$(): Signal<Dataset | undefined> {
    return this._disease$.asReadonly();
  }

  private _isLoading$ = signal<boolean>(false);

  get isLoading$(): Signal<boolean> {
    return this._isLoading$.asReadonly();
  }

  async runQuery(config: CeRNAQuery) {
    this._isLoading$.set(true);

    const ceRNA$ = this.backend.getCeRNA(config);
    const runInfo$ = this.backend.getDatasetInfo(config.disease.disease_name);
    const ensgs$ = ceRNA$.then(ceRNAs => ceRNAs.map(ceRNA => ceRNA.gene.ensg_number));
    const interactions$ = ensgs$.then(async (ensgs) =>
      await this.backend.getCeRNAInteractionsSpecific(config.disease.disease_name, config.maxPValue, ensgs));

    const [ceRNAs, runInfo, interactions] = await Promise.all([ceRNA$, runInfo$, interactions$]);

    console.log(interactions);

    this._disease$.set(config.disease);
    this._ceRNAs$.set(ceRNAs);
    this._interactions$.set(interactions);
    this._isLoading$.set(false);
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
