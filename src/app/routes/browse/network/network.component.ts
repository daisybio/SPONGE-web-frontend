import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {BrowseService, EntityState, State} from "../../../services/browse.service";
import {ReplaySubject} from "rxjs";
import Graph from "graphology";
import Sigma from "sigma";
import {Settings} from "sigma/settings";

const states: Record<State, {
  edgeColor: string,
  edgeWidth: number,
  nodeColor: string,
  nodeSize: number,
  highlight: boolean
}>
  = {
  [State.Default]: {
    edgeColor: '#000',
    edgeWidth: 3,
    nodeColor: '#052444',
    nodeSize: 10,
    highlight: false
  },
  [State.Hover]: {
    edgeColor: '#ff0000',
    edgeWidth: 6,
    nodeColor: '#ff0000',
    nodeSize: 10,
    highlight: true
  },
  [State.Active]: {
    nodeColor: '#008cff',
    edgeColor: '#008cff',
    edgeWidth: 6,
    nodeSize: 15,
    highlight: true
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
  browseService = inject(BrowseService);
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;
  refreshSignal = input.required<any>();
  draggedNode$: WritableSignal<string | undefined> = signal(undefined);

  constructor() {
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
      const sigma = new Sigma(graph, this.container.nativeElement, sigma_settings);

      sigma.on('clickNode', event => {
        if (event.node === this.draggedNode$()) return;
        this.browseService.toggleState(event.node, 'node', State.Active);
      });

      sigma.on('clickEdge', event => {
        this.browseService.toggleState(event.edge, 'edge', State.Active);
      })

      sigma.on('enterEdge', event => {
        this.browseService.setState(event.edge, 'edge', State.Hover, true);
      })

      sigma.on('leaveEdge', event => {
        this.browseService.setState(event.edge, 'edge', State.Hover, false);
      })

      sigma.on('downNode', event => {
        this.draggedNode$.set(event.node);
        graph.setNodeAttribute(event.node, 'highlighted', true);
        if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
      })

      sigma.on('moveBody', ({event}) => {
        const node = this.draggedNode$();
        if (node === undefined) return;

        const pos = sigma.viewportToGraph(event);

        graph.setNodeAttribute(node, 'x', pos.x);
        graph.setNodeAttribute(node, 'y', pos.y);

        event.preventSigmaDefault();
        event.original.preventDefault();
        event.original.stopPropagation();
      })

      const handleUpNode = (event: any) => {
        const node = this.draggedNode$();
        if (node === undefined) return;

        graph.setNodeAttribute(node, 'highlighted', false);
        this.draggedNode$.set(undefined);
      }

      sigma.on('upNode', event => {
        handleUpNode(event);
      })
      sigma.on('upStage', event => {
        handleUpNode(event);
      })

      this.sigma = sigma;
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
    this.sigma?.getGraph().setNodeAttribute(node, 'highlighted', states[state].highlight);
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
