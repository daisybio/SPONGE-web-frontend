import {AfterViewInit, Component, effect, ElementRef, input, OnDestroy, ViewChild} from '@angular/core';
import {BrowseService, EntityState, State} from "../../../services/browse.service";
import {ReplaySubject} from "rxjs";
import Graph from "graphology";
import Sigma from "sigma";
import {Settings} from "sigma/settings";

const states: Record<State, { edgeColor: string, edgeWidth: number, nodeColor: string, nodeSize: number }>
  = {
  [State.Default]: {
    edgeColor: '#000',
    edgeWidth: 3,
    nodeColor: '#052444',
    nodeSize: 10
  },
  [State.Hover]: {
    edgeColor: '#ff0000',
    edgeWidth: 6,
    nodeColor: '#ff0000',
    nodeSize: 10
  },
  [State.Active]: {
    nodeColor: '#008cff',
    edgeColor: '#008cff',
    edgeWidth: 6,
    nodeSize: 15
  }
}


const sigma_settings: Partial<Settings> = {
  defaultEdgeColor: states[State.Default].edgeColor,
  minEdgeThickness: states[State.Default].edgeWidth,
  defaultNodeColor: states[State.Default].nodeColor,
  enableEdgeEvents: true,
  allowInvalidContainer: true,
  minCameraRatio: 0.5,
  maxCameraRatio: 2,
}

@Component({
  selector: 'app-network',
  imports: [],
  templateUrl: './network.component.html',
  styleUrl: './network.component.scss'
})
export class NetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild("container") container!: ElementRef;
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;
  refreshSignal = input.required<any>();

  constructor(private browseService: BrowseService) {
    effect(() => {
      this.graph$.next(this.browseService.graph$());
    });

    effect(() => {
      this.updateEdges(this.browseService.edgeStates$());
    });

    effect(() => {
      this.updateNodes(this.browseService.nodeStates$());
    });

    effect(() => {
      this.refreshSignal();
      this.refresh();
    });
  }


  ngAfterViewInit(): void {
    this.graph$.subscribe(graph => {
      this.sigma?.kill();
      this.sigma = new Sigma(graph, this.container.nativeElement, sigma_settings);

      this.sigma.on('clickNode', event => {
        this.browseService.toggleState(event.node, 'node', State.Active);
      });

      this.sigma.on('clickEdge', event => {
        this.browseService.toggleState(event.edge, 'edge', State.Active);
      })

      this.sigma.on('enterEdge', event => {
        this.browseService.setState(event.edge, 'edge', State.Hover, true);
      })

      this.sigma.on('leaveEdge', event => {
        this.browseService.setState(event.edge, 'edge', State.Hover, false);
      })
    });

    this.updateNodes(this.browseService.nodeStates$());
    this.updateEdges(this.browseService.edgeStates$());
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
    if (!this.sigma?.getGraph().hasEdge(edge)) {
      return;
    }
    this.sigma?.getGraph().setEdgeAttribute(edge, 'color', states[state].edgeColor);
    this.sigma?.getGraph().setEdgeAttribute(edge, 'size', states[state].edgeWidth);
  }

  setNodeState(node: string, state: State) {
    if (!this.sigma?.getGraph().hasNode(node)) {
      return;
    }
    this.sigma?.getGraph().setNodeAttribute(node, 'color', states[state].nodeColor);
    this.sigma?.getGraph().setNodeAttribute(node, 'size', states[state].nodeSize);
  }

  refresh() {
    this.sigma?.refresh();
  }

  ngOnDestroy(): void {
    this.sigma?.kill();
  }

  private updateEdges(edgeStates: Record<string, EntityState>) {
    Object.entries(edgeStates).forEach(([edge, state]) => {
      this.setEdgeState(edge, this.determineState(state));
    });
  }

  private updateNodes(nodeStates: Record<string, EntityState>) {
    Object.entries(nodeStates).forEach(([node, state]) => {
      this.setNodeState(node, this.determineState(state));
    });
  }
}
