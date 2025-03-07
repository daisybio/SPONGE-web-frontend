import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import {
  BrowseService,
  EntityState,
  State,
} from '../../../services/browse.service';
import { ReplaySubject } from 'rxjs';
import Graph from 'graphology';
import Sigma from 'sigma';
import { Settings } from 'sigma/settings';
import { MatAnchor, MatButtonModule } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { NodeCircleProgram } from 'sigma/rendering';
import { NodeSquareProgram } from '@sigma/node-square';
import { InfoComponent } from '../../../components/info/info.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { capitalize } from 'lodash';
import { downloadAsJPEG, downloadAsPNG } from '@sigma/export-image';

const states: Record<
  State,
  {
    edgeColor: string;
    edgeWidth: number;
    nodeColor: string;
    nodeSize: number;
    highlight: boolean;
  }
> = {
  [State.Default]: {
    edgeColor: '#b7b7b7',
    edgeWidth: 3,
    nodeColor: '#052444',
    nodeSize: 10,
    highlight: false,
  },
  [State.Hover]: {
    edgeColor: '#ff0000',
    edgeWidth: 6,
    nodeColor: '#ff0000',
    nodeSize: 10,
    highlight: true,
  },
  [State.Active]: {
    nodeColor: '#008cff',
    edgeColor: '#008cff',
    edgeWidth: 6,
    nodeSize: 15,
    highlight: true,
  },
};

const sigma_settings: Partial<Settings> = {
  defaultEdgeColor: states[State.Default].edgeColor,
  minEdgeThickness: states[State.Default].edgeWidth,
  defaultNodeColor: states[State.Default].nodeColor,
  enableEdgeEvents: true,
  allowInvalidContainer: true,
  minCameraRatio: 0.5,
  maxCameraRatio: 2,
  nodeProgramClasses: {
    square: NodeSquareProgram,
    circle: NodeCircleProgram,
  },
};

const MIN_DRAG_TIME = 200;

@Component({
  selector: 'app-network',
  imports: [
    MatAnchor,
    MatTooltip,
    InfoComponent,
    MatSlideToggle,
    FormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './network.component.html',
  styleUrl: './network.component.scss',
})
export class NetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') container!: ElementRef;
  browseService = inject(BrowseService);
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;
  level$ = this.browseService.level$;

  circleExplanation$: Signal<string> = computed(() => {
    switch (this.level$()) {
      case 'gene':
        return 'Gene, where at least one transcript is present in the transcript-level network with the same thresholds.';
      case 'transcript':
        return 'Transcript, where the corresponding gene is present in the gene-level network with the same thresholds.';
      default:
        return '';
    }
  });

  squareExplanation$: Signal<string> = computed(() => {
    switch (this.level$()) {
      case 'gene':
        return 'Gene, where no transcript is present in the transcript-level network with the same thresholds.';
      case 'transcript':
        return 'Transcript, where the corresponding gene is not present in the gene-level network with the same thresholds.';
      default:
        return '';
    }
  });

  refreshSignal = input.required<any>();
  physicsEnabled$ = this.browseService.physicsEnabled$;
  draggedNode$: WritableSignal<string | undefined> = signal(undefined);
  dragStart$ = signal<number | undefined>(undefined);
  gProfilerUrl$ = computed(() =>
    BrowseService.getGProfilerUrlForNodes(this.browseService.nodes$())
  );
  protected readonly capitalize = capitalize;

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
    this.graph$.subscribe((graph) => {
      this.sigma?.kill();
      const sigma = new Sigma(
        graph,
        this.container.nativeElement,
        sigma_settings
      );

      sigma.on('clickNode', (event) => {
        const dragStart = this.dragStart$();
        if (dragStart && Date.now() - dragStart > MIN_DRAG_TIME) return;
        this.browseService.toggleState(event.node, 'node', State.Active);
      });

      sigma.on('clickEdge', (event) => {
        this.browseService.toggleState(event.edge, 'edge', State.Active);
      });

      sigma.on('enterEdge', (event) => {
        this.browseService.setState(event.edge, 'edge', State.Hover, true);
      });

      sigma.on('leaveEdge', (event) => {
        this.browseService.setState(event.edge, 'edge', State.Hover, false);
      });

      sigma.on('downNode', (event) => {
        this.browseService.setState(event.node, 'node', State.Hover, true);
        if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
        this.draggedNode$.set(event.node);
        this.dragStart$.set(Date.now());
      });

      sigma.on('moveBody', ({ event }) => {
        const node = this.draggedNode$();
        if (node === undefined) return;

        const pos = sigma.viewportToGraph(event);

        graph.setNodeAttribute(node, 'x', pos.x);
        graph.setNodeAttribute(node, 'y', pos.y);

        event.preventSigmaDefault();
        event.original.preventDefault();
        event.original.stopPropagation();
      });

      const handleUpNode = (event: any) => {
        const node = this.draggedNode$();
        if (node === undefined) return;

        this.browseService.setState(node, 'node', State.Hover, false);
        this.draggedNode$.set(undefined);
      };

      sigma.on('upNode', (event) => {
        handleUpNode(event);
      });
      sigma.on('upStage', (event) => {
        handleUpNode(event);
      });

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
    this.sigma
      ?.getGraph()
      .setEdgeAttribute(edge, 'color', states[state].edgeColor);
    this.sigma
      ?.getGraph()
      .setEdgeAttribute(edge, 'size', states[state].edgeWidth);
  }

  setNodeState(node: string, state: State) {
    if (!this.sigma?.getGraph().hasNode(node)) {
      return;
    }
    this.sigma
      ?.getGraph()
      .setNodeAttribute(node, 'color', states[state].nodeColor);
    this.sigma
      ?.getGraph()
      .setNodeAttribute(node, 'size', states[state].nodeSize);
    this.sigma
      ?.getGraph()
      .setNodeAttribute(node, 'highlighted', states[state].highlight);
  }

  refresh() {
    this.sigma?.refresh();
  }

  ngOnDestroy(): void {
    this.sigma?.kill();
  }

  resetCamera() {
    const camera = this.sigma?.getCamera();
    if (camera !== undefined) {
      camera.x = 0.5;
      camera.y = 0.5;
      camera.ratio = 1;
    }
  }

  async downloadImage() {
    const sigma = this.sigma;
    if (sigma === undefined) {
      return;
    }

    await downloadAsPNG(sigma, {
      backgroundColor: '#ffffff',
    });
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
