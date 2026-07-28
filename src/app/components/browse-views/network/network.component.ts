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
import { PredictBrowseService } from '../../../services/predict.browse.service';
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

// Green frame drawn around module-center nodes.
const CENTER_FRAME_COLOR = '#00a651';

const SQUARE_BORDER_VERTEX_SHADER = /*glsl*/ `
attribute vec4 a_id;
attribute vec4 a_color;
attribute vec2 a_position;
attribute float a_size;
attribute float a_angle;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_cameraAngle;
uniform float u_correctionRatio;

varying vec4 v_color;
varying vec2 v_corner;

const float bias = 255.0 / 254.0;
const float sqrt_8 = sqrt(8.0);

void main() {
  float size = a_size * u_correctionRatio / u_sizeRatio * sqrt_8;
  float angle = a_angle + u_cameraAngle; 
  vec2 diffVector = size * vec2(cos(angle), sin(angle));
  vec2 position = a_position + diffVector;
  gl_Position = vec4(
    (u_matrix * vec3(position, 1)).xy,
    0,
    1
  );

  v_corner = vec2(cos(a_angle), sin(a_angle));

  #ifdef PICKING_MODE
  v_color = a_id;
  #else
  v_color = a_color;
  #endif

  v_color.a *= bias;
}
`;

const SQUARE_BORDER_FRAGMENT_SHADER = /*glsl*/ `
precision mediump float;

varying vec4 v_color;
varying vec2 v_corner;

const float borderThickness = 0.22;

void main(void) {
  #ifdef PICKING_MODE
  gl_FragColor = v_color;
  #else
  float maxCoord = max(abs(v_corner.x), abs(v_corner.y));
  // cos(PI/4) is ~0.7071
  if (maxCoord > 0.7071 * (1.0 - borderThickness)) {
    // Green frame color (#00a651)
    gl_FragColor = vec4(0.0, 0.651, 0.318, v_color.a);
  } else {
    gl_FragColor = v_color;
  }
  #endif
}
`;

class NodeSquareBorderProgram extends NodeSquareProgram {
  override getDefinition() {
    const def = super.getDefinition();
    return {
      ...def,
      VERTEX_SHADER_SOURCE: SQUARE_BORDER_VERTEX_SHADER,
      FRAGMENT_SHADER_SOURCE: SQUARE_BORDER_FRAGMENT_SHADER,
    };
  }
}

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
    borderedCircle: createNodeBorderProgram({
      borders: [
        { size: { value: 0.3 }, color: { value: CENTER_FRAME_COLOR } },
        { size: { fill: true }, color: { attribute: 'color' } },
      ],
    }),
    borderedSquare: NodeSquareBorderProgram,
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
  legendSubtitle = input<string>();
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;
  level$ = computed(() => this.browseService().level$());
  legendItems$ = signal<{ type: string; color: string; frame?: boolean }[]>([]);

  getNodeColorForType(nodeType?: string): string {
    if (!nodeType) return '#808080'; // Mid Grey
    const typeLower = nodeType.toLowerCase().replace(/_/g, '').replace(/ /g, '');
    if (typeLower === 'unknown') return '#808080'; // Mid Grey

    if (typeLower.includes('proteincoding')) return '#052444'; // SPONGE Navy
    if (typeLower.includes('lncrna')) return '#27805aff'; // Forest Green
    if (typeLower.includes('mirna') || typeLower.includes('ncrna')) return '#cf6609ff'; // Bright Orange
    if (typeLower.includes('pseudogene')) return '#480fa3ff'; // Muted Purple
    if (typeLower.includes('snrna')) return '#ac8d00ff'; // Yellow
    if (typeLower.includes('snoRNA') || typeLower.includes('snorna')) return '#8c8e06ff'; // Olive Green
    if (typeLower.includes('trna')) return '#138c99ff'; // Teal/Cyan
    if (typeLower.includes('rrna')) return '#a03c82ff'; // Pink

    return '#8c564b'; // Brown
  }
  isPredict$ = computed(() => this.browseService() instanceof PredictBrowseService);
  allNodesSelected$ = computed(() => this.browseService().allNodesSelected$());
  allEdgesSelected$ = computed(() => this.browseService().allEdgesSelected$());

  networkInfoText$: Signal<string> = computed(() => {
    if (this.isPredict$()) {
      return 'What you see is a patient-specific ceRNA network constructed from top ceRNA module hub(s) and their interactions.';
    }
    return 'What you see is a subset of a large ceRNA network obtained by applying SPONGE to data from TCGA. The entire network is too large to visualize here. You can adjust the filter criteria using the controls on the left.';
  });

  circleExplanation$: Signal<string> = computed(() => {
    const isPredict = this.isPredict$();
    switch (this.level$()) {
      case 'gene':
        return isPredict
          ? 'Gene, where at least one transcript is present in the full transcript-level network for this disease in the database.'
          : 'Gene, where at least one transcript is present in the transcript-level network with the same thresholds.';
      case 'transcript':
        return isPredict
          ? 'Transcript, where the corresponding gene is present in the full gene-level network for this disease in the database.'
          : 'Transcript, where the corresponding gene is present in the gene-level network with the same thresholds.';
      default:
        return '';
    }
  });

  squareExplanation$: Signal<string> = computed(() => {
    const isPredict = this.isPredict$();
    switch (this.level$()) {
      case 'gene':
        return isPredict
          ? 'Gene, where no transcript is present in the full transcript-level network for this disease in the database.'
          : 'Gene, where no transcript is present in the transcript-level network with the same thresholds.';
      case 'transcript':
        return isPredict
          ? 'Transcript, where the corresponding gene is not present in the full gene-level network for this disease in the database.'
          : 'Transcript, where the corresponding gene is not present in the gene-level network with the same thresholds.';
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

    let color: string;
    if (state === State.Hover) {
      color = states[State.Hover].nodeColor;
    } else {
      // Default or Active: keep the exact node type color
      color = defaultColor;
    }

    graph.setNodeAttribute(node, 'color', color);
    graph.setNodeAttribute(node, 'highlighted', states[state].highlight);
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
