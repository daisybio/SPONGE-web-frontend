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
import { createNodeBorderProgram } from '@sigma/node-border';
import { InfoComponent } from '../../info/info.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { capitalize } from 'lodash';
import { downloadAsJPEG, downloadAsPNG } from '@sigma/export-image';

const states: Record<
  State,
  {
    edgeColor: string;
    nodeColor: string;
    highlight: boolean;
  }
> = {
  [State.Default]: {
    edgeColor: '#b7b7b7',
    nodeColor: '#052444',
    highlight: false,
  },
  [State.Hover]: {
    edgeColor: '#ff0000',
    nodeColor: '#ff0000',
    highlight: true,
  },
  [State.Active]: {
    nodeColor: '#008cff',
    edgeColor: '#008cff',
    highlight: true,
  },
};

// Green frame drawn around module-center nodes (see 'bordered' node program below).
const CENTER_FRAME_COLOR = '#00a651';

const sigma_settings: Partial<Settings> = {
  defaultEdgeColor: states[State.Default].edgeColor,
  defaultNodeColor: states[State.Default].nodeColor,
  enableEdgeEvents: true,
  allowInvalidContainer: true,
  minCameraRatio: 0.5,
  maxCameraRatio: 2,
  nodeProgramClasses: {
    square: NodeSquareProgram,
    circle: NodeCircleProgram,
    // Module centers: a green ring around the node, interior keeps the gene-type colour.
    bordered: createNodeBorderProgram({
      borders: [
        { size: { value: 0.3 }, color: { value: CENTER_FRAME_COLOR } },
        { size: { fill: true }, color: { attribute: 'color' } },
      ],
    }),
  },
};

const MIN_DRAG_TIME = 200;

@Component({
  selector: 'app-network',
  imports: [
    MatAnchor,
    MatTooltip,
    InfoComponent,
    MatSlideToggleModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './network.component.html',
  styleUrl: './network.component.scss',
})
export class NetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') container!: ElementRef;
  browseService = input.required<BrowseService>();
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;
  level$ = computed(() => this.browseService().level$());
  legendItems$ = signal<{ type: string; color: string; frame?: boolean }[]>([]);

  getNodeColorForType(nodeType?: string): string {
    if (!nodeType) return '#052444';
    const typeLower = nodeType.toLowerCase().replace(/_/g, '').replace(/ /g, '');
    if (typeLower === 'unknown') return '#052444';

    if (typeLower.includes('proteincoding')) return '#1f77b4'; // Steel Blue
    if (typeLower.includes('lncrna')) return '#2ca02c'; // Forest Green
    if (typeLower.includes('mirna') || typeLower.includes('ncrna')) return '#ff7f0e'; // Bright Orange
    if (typeLower.includes('pseudogene')) return '#9467bd'; // Muted Purple
    if (typeLower.includes('snrna')) return '#d62728'; // Crimson Red
    if (typeLower.includes('snorna')) return '#bcbd22'; // Olive Green
    if (typeLower.includes('trna')) return '#17becf'; // Teal/Cyan
    if (typeLower.includes('rrna')) return '#e377c2'; // Pink

    return '#8c564b'; // Brown
  }
  allNodesSelected$ = computed(() => this.browseService().allNodesSelected$());
  allEdgesSelected$ = computed(() => this.browseService().allEdgesSelected$());

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
  physicsEnabled$ = computed(() => this.browseService().physicsEnabled$());
  draggedNode$: WritableSignal<string | undefined> = signal(undefined);
  dragStart$ = signal<number | undefined>(undefined);
  gProfilerUrl$ = computed(() =>
    BrowseService.getGProfilerUrlForNodes(this.browseService().nodes$())
  );
  protected readonly capitalize = capitalize;

  constructor() {
    effect(() => {
      this.graph$.next(this.browseService().graph$());
    });

    effect(() => {
      this.updateEdges(this.browseService().edgeStates$());
    });

    effect(() => {
      this.updateNodes(this.browseService().nodeStates$());
    });

    effect(() => {
      this.refreshSignal();
      this.refresh();
    });
  }

  ngAfterViewInit(): void {
    this.graph$.subscribe((graph) => {
      this.sigma?.kill();

      // Extract unique node types and calculate color mappings
      const types = new Set<string>();
      let hasCenter = false;
      graph.forEachNode((_, attributes) => {
        if (attributes['nodeType']) {
          types.add(attributes['nodeType']);
        }
        if (attributes['isCenter']) hasCenter = true;
      });
      const items: { type: string; color: string; frame?: boolean }[] =
        Array.from(types).sort().map(type => ({
          type: type === 'unknown' ? 'Unknown' : capitalize(type.replace(/_/g, ' ')),
          color: this.getNodeColorForType(type),
        }));
      // Module centers are drawn with a green frame; surface that in the legend.
      if (hasCenter) {
        items.unshift({ type: 'Module center', color: CENTER_FRAME_COLOR, frame: true });
      }
      this.legendItems$.set(items);

      const sigma = new Sigma(
        graph,
        this.container.nativeElement,
        sigma_settings
      );

      sigma.on('clickNode', (event) => {
        const dragStart = this.dragStart$();
        if (dragStart && Date.now() - dragStart > MIN_DRAG_TIME) return;
        this.browseService().toggleState(event.node, 'node', State.Active);
      });

      sigma.on('clickEdge', (event) => {
        this.browseService().toggleState(event.edge, 'edge', State.Active);
      });

      sigma.on('enterEdge', (event) => {
        this.browseService().setState(event.edge, 'edge', State.Hover, true);
      });

      sigma.on('leaveEdge', (event) => {
        this.browseService().setState(event.edge, 'edge', State.Hover, false);
      });

      sigma.on('downNode', (event) => {
        this.browseService().setState(event.node, 'node', State.Hover, true);
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

        this.browseService().setState(node, 'node', State.Hover, false);
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

    this.updateNodes(this.browseService().nodeStates$());
    this.updateEdges(this.browseService().edgeStates$());
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
  }

  setNodeState(node: string, state: State) {
    if (!this.sigma?.getGraph().hasNode(node)) {
      return;
    }
    const graph = this.sigma.getGraph();
    const nodeType = graph.getNodeAttribute(node, 'nodeType');
    const defaultColor = this.getNodeColorForType(nodeType);

    graph.setNodeAttribute(node, 'color', state === State.Default ? defaultColor : states[state].nodeColor);
    graph.setNodeAttribute(node, 'highlighted', states[state].highlight || !!graph.getNodeAttribute(node, 'isCenter'));
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

  setAllNodesState(state: boolean) {
    this.browseService().setAllNodesState(state);
  }

  setAllEdgesState(state: boolean) {
    this.browseService().setAllEdgesState(state);
  }

  togglePhysics() {
    this.browseService().physicsEnabled$.update((enabled) => !enabled);
  }
}
