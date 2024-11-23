import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  OnDestroy,
  Signal,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {BrowseService, BrowseState} from "../../../services/browse.service";
import {ReplaySubject} from "rxjs";
import {toObservable} from "@angular/core/rxjs-interop";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma";
import {Settings} from "sigma/settings";
import {CeRNA, CeRNAInteraction} from "../../../interfaces";

enum State {
  Default,
  Hover,
  Active
}

const states: Record<State, { edgeColor: string; edgeWidth: number; nodeColor: string }>
  = {
  [State.Default]: {
    edgeColor: '#000',
    edgeWidth: 3,
    nodeColor: '#052444',
  },
  [State.Hover]: {
    edgeColor: '#ff0000',
    edgeWidth: 6,
    nodeColor: '#ff0000',
  },
  [State.Active]: {
    nodeColor: '#008cff',
    edgeColor: '#008cff',
    edgeWidth: 6,
  }
}

interface EntityState {
  [State.Hover]: boolean;
  [State.Active]: boolean;
}

const sigma_settings: Partial<Settings> = {
  defaultEdgeColor: states[State.Default].edgeColor,
  minEdgeThickness: states[State.Default].edgeWidth,
  defaultNodeColor: states[State.Default].nodeColor,
  enableEdgeEvents: true,
}

@Component({
  selector: 'app-network',
  imports: [],
  template: '<div #container style="height: 500px"></div>',
  styleUrl: './network.component.scss'
})
export class NetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild("container") container!: ElementRef;
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;
  data$: Signal<BrowseState | undefined>;
  nodeStates$ = signal<Record<string, EntityState>>({});
  edgeStates$ = signal<Record<string, EntityState>>({});
  activeNodeIDs$ = computed(() => Object.entries(this.nodeStates$()).filter(([_, state]) => state[State.Active]).map(([node, _]) => node));
  activeEdgeIDs$ = computed(() => Object.entries(this.edgeStates$()).filter(([_, state]) => state[State.Active]).map(([edge, _]) => edge));

  activeCeRNAs$: Signal<CeRNA[]>;
  activeInteractions$: Signal<CeRNAInteraction[]>;

  constructor(private browseService: BrowseService) {
    this.data$ = this.browseService.data$;
    toObservable(this.data$).subscribe(data => {
      if (data === undefined) return;
      const ceRNAs = data.ceRNAs;
      const interactions = data.interactions;

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

      this.graph$.next(graph);
    })

    this.activeCeRNAs$ = computed(() => {
      const data = this.data$();
      if (data === undefined) return [];
      const nodeIDs = this.activeNodeIDs$();

      return data.ceRNAs.filter(ceRNA => nodeIDs.includes(ceRNA.gene.ensg_number));
    });

    this.activeInteractions$ = computed(() => {
      const data = this.data$();
      if (data === undefined) return [];
      const edgeIDs = this.activeEdgeIDs$();
      return edgeIDs.map(edgeID => {
        return this.getInteractionForEdge(edgeID, data);
      }).filter(interaction => interaction !== undefined) as CeRNAInteraction[];
    });


    effect(() => {
      Object.entries(this.nodeStates$()).forEach(([node, state]) => {
        this.setNodeState(node, this.determineState(state));
      });
    });

    effect(() => {
      Object.entries(this.edgeStates$()).forEach(([edge, state]) => {
        this.setEdgeState(edge, this.determineState(state));
      });
    });
  }

  getInteractionForEdge(edgeID: string, data: BrowseState): CeRNAInteraction | undefined {
    const sigma = this.sigma;
    if (sigma === undefined) return;
    const graph = sigma.getGraph();
    const source = graph?.source(edgeID);
    const target = graph?.target(edgeID);
    return data.interactions.find(interaction => {
      return (interaction.gene1.ensg_number === source && interaction.gene2.ensg_number === target) ||
        (interaction.gene1.ensg_number === target && interaction.gene2.ensg_number === source);
    });
  }

  ngAfterViewInit(): void {
    this.graph$.subscribe(graph => {
      this.sigma?.kill();
      this.sigma = new Sigma(graph, this.container.nativeElement, sigma_settings);
      this.nodeStates$.set(this.sigma.getGraph().nodes().reduce((acc, node) => {
        acc[node] = {[State.Hover]: false, [State.Active]: false};
        return acc;
      }, {} as Record<string, EntityState>));

      this.sigma.on('clickNode', event => {
        this.toggleState(event.node, State.Active, this.nodeStates$);
      });

      this.sigma.on('clickEdge', event => {
        this.toggleState(event.edge, State.Active, this.edgeStates$);
      })

      this.sigma.on('enterEdge', event => {
        this.setState(event.edge, State.Hover, true, this.edgeStates$);
      })

      this.sigma.on('leaveEdge', event => {
        this.setState(event.edge, State.Hover, false, this.edgeStates$);
      })
    });
  }

  setState(entity: string, state: State, value: boolean, entityStates: WritableSignal<Record<string, EntityState>>) {
    entityStates.update(states => {
      return {
        ...states,
        [entity]: {
          ...states[entity],
          [state]: value
        }
      }
    })
  }

  toggleState(entity: string, state: State, entityStates: WritableSignal<Record<string, EntityState>>) {
    entityStates.update(states => {
      return {
        ...states,
        [entity]: {
          [State.Hover]: state === State.Hover ? !states[entity][State.Hover] : states[entity][State.Hover],
          [State.Active]: state === State.Active ? !states[entity][State.Active] : states[entity][State.Active]
        }
      }
    })
  }

  determineState(entityState: EntityState): State {
    if (entityState[State.Hover]) {
      return State.Hover;
    } else if (entityState[State.Active]) {
      return State.Active;
    } else {
      return State.Default;
    }
  }

  setEdgeState(edge: string, state: State) {
    this.sigma?.getGraph().setEdgeAttribute(edge, 'color', states[state].edgeColor);
    this.sigma?.getGraph().setEdgeAttribute(edge, 'size', states[state].edgeWidth);
  }

  setNodeState(node: string, state: State) {
    this.sigma?.getGraph().setNodeAttribute(node, 'color', states[state].nodeColor);
  }

  ngOnDestroy(): void {
    this.sigma?.kill();
  }
}
