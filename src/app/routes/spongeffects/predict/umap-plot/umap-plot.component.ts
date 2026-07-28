import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  viewChild,
  signal,
  resource,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PredictService } from '../service/predict.service';
import { ExploreService } from '../../explore/service/explore.service';
import { BackendService } from '../../../../services/backend.service';
import { InfoComponent } from '../../../../components/info/info.component';
import { capitalize } from 'lodash';
import { buildColorMap, getDiseaseDisplayName } from '../../../../cancer-colors';

declare var Plotly: any;

function formatSubtypeName(typeStr?: string, subtypeStr?: string): { typeName?: string; subtypeName?: string } {
  if (!typeStr && !subtypeStr) return {};

  const typeName = typeStr ? getDiseaseDisplayName(typeStr) : undefined;
  if (!subtypeStr) return { typeName };

  let rawSubtype = subtypeStr;
  if (typeStr && rawSubtype.toLowerCase().startsWith(typeStr.toLowerCase() + '_')) {
    rawSubtype = rawSubtype.slice(typeStr.length + 1);
  } else if (rawSubtype.includes('_')) {
    const parts = rawSubtype.split('_');
    if (parts.length === 2 && parts[0].length <= 5) {
      rawSubtype = parts[1];
    }
  }

  const subtypeName = getDiseaseDisplayName(rawSubtype);
  return { typeName, subtypeName };
}

@Component({
  selector: 'app-umap-plot',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    InfoComponent,
  ],
  template: `
    <div style="padding: 16px;">
      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      } @else if (!hasData()) {
        <div class="card-container" style="padding: 24px; text-align: center; color: #666;">
          <p>
            @if (mode() === 'explore') {
              No UMAP coordinates available.
            } @else {
              No UMAP coordinates available. Please perform a prediction first.
            }
          </p>
        </div>
      } @else {
        <div style="display: flex; justify-content: flex-end; padding-right: 16px; margin-bottom: -40px; position: relative; z-index: 10;">
          <button mat-icon-button [matMenuTriggerFor]="umapDownloadMenu" matTooltip="Download Plot">
            <mat-icon>download</mat-icon>
          </button>
          <mat-menu #umapDownloadMenu="matMenu">
            <button mat-menu-item (click)="downloadPlot('png')">Download PNG</button>
            <button mat-menu-item (click)="downloadPlot('jpeg')">Download JPEG</button>
            <button mat-menu-item (click)="downloadPlot('svg')">Download SVG</button>
          </mat-menu>
        </div>
      }

      <div style="width: 100%; overflow-x: auto;">
        <div #umapPlot style="width: 100%; height: auto; min-height: 650px;"></div>
      </div>

      <app-info type="panel">
        @if (mode() === 'explore') {
          <p>
            This UMAP plot projects reference TCGA samples (dots, colored by cancer type) using their SpongEffects enrichment scores.
            Points that are closer together have more similar ceRNA regulation profiles.
          </p>
        } @else {
          <p>
            This UMAP plot projects your uploaded samples (shown as large red diamonds)
            alongside reference TCGA samples (dots, colored by cancer type) using their SpongEffects enrichment scores.
            Points that are closer together have more similar ceRNA regulation profiles.
          </p>
          <p>
            SpongEffects scores are free of batch effects, allowing direct comparison of your custom samples
            with the reference TCGA cohort.
          </p>
        }
      </app-info>
    </div>
  `,
})
export class UmapPlotComponent implements OnDestroy {
  predictService = inject(PredictService);
  exploreService = inject(ExploreService, { optional: true });
  backend = inject(BackendService);
  plotDiv = viewChild.required<ElementRef<HTMLDivElement>>('umapPlot');

  mode = input<'predict' | 'explore'>('predict');

  exploreUmapResource = resource({
    request: computed(() => {
      if (this.mode() !== 'explore') return undefined;
      const level = this.exploreService?.level$();
      return level;
    }),
    loader: async ({ request: level }) => {
      if (!level) return undefined;
      try {
        const data = await this.backend.getUmapProjection(level, { values: [], samples: [], genes: [] });
        return data;
      } catch (e) {
        console.error('Error fetching TCGA UMAP projection:', e);
        return undefined;
      }
    }
  });

  isLoading = computed(() => {
    if (this.mode() === 'explore') {
      return this.exploreUmapResource.isLoading();
    }
    return this.predictService.isLoading$();
  });

  hasData = computed(() => {
    if (this.mode() === 'explore') {
      const data = this.exploreUmapResource.value();
      return !!(data && data.tcga_umap && Object.keys(data.tcga_umap).length > 0);
    }
    const pred = this.predictService.prediction$();
    return !!(pred && pred.tcga_umap && Object.keys(pred.tcga_umap).length > 0);
  });

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const mode = this.mode();
      const div = this.plotDiv()?.nativeElement;
      if (!div) return;

      let tcga_umap: any = null;
      let user_umap: any = null;

      if (mode === 'explore') {
        const data = this.exploreUmapResource.value();
        if (data) {
          tcga_umap = data.tcga_umap;
          user_umap = data.user_umap || {};
        }
      } else {
        const pred = this.predictService.prediction$();
        if (pred) {
          tcga_umap = pred.tcga_umap;
          user_umap = pred.user_umap || {};
        }
      }

      if (!tcga_umap || Object.keys(tcga_umap).length === 0) {
        Plotly.purge(div);
        return;
      }

      const pred = mode === 'predict' ? this.predictService.prediction$() : undefined;
      const isSubtype = mode === 'predict'
        ? (this.predictService._subtypes$() || (pred?.meta?.[0]?.subtype_predict !== undefined && pred?.meta?.[0]?.subtype_predict !== 'NA'))
        : (this.exploreService?.selectedDisease$() !== 'pancancer');

      // Group TCGA coordinates by cancer class/type
      const groups: { [key: string]: { x: number[]; y: number[]; text: string[] } } = {};
      for (const [patient, info] of Object.entries(tcga_umap)) {
        const item = info as any;
        const cls = item.class || 'Unknown';
        if (!groups[cls]) {
          groups[cls] = { x: [], y: [], text: [] };
        }
        groups[cls].x.push(item.x);
        groups[cls].y.push(item.y);
        groups[cls].text.push(patient);
      }

      // Build color mapping
      const classes = Object.keys(groups).sort();
      const colorMap = buildColorMap(classes);

      const traces: any[] = [];

      // Add TCGA traces
      for (const cls of classes) {
        const group = groups[cls];
        const color = colorMap[cls] || '#888888';
        const displayName = getDiseaseDisplayName(cls);
        traces.push({
          x: group.x,
          y: group.y,
          text: group.text.map(id => `${id} (${displayName})`),
          type: 'scattergl',
          mode: 'markers',
          name: displayName,
          marker: {
            size: 5,
            color: color,
            opacity: 0.5,
          },
          hoverinfo: 'text',
        });
      }

      if (mode === 'predict') {
        // Build prediction lookup for user samples (case/format insensitive)
        const predDataMap = new Map<string, { typePrediction?: string; subtypePrediction?: string }>();
        if (pred?.data) {
          for (const item of pred.data) {
            if (item.sampleID) {
              predDataMap.set(item.sampleID, item);
              predDataMap.set(item.sampleID.toLowerCase(), item);
              predDataMap.set(item.sampleID.replace(/[^a-zA-Z0-9]/g, ''), item);
            }
          }
        }

        // Add user traces
        const userX: number[] = [];
        const userY: number[] = [];
        const userText: string[] = [];

        for (const [sample, coords] of Object.entries(user_umap)) {
          const item = coords as any;
          userX.push(item.x);
          userY.push(item.y);

          const samplePred = predDataMap.get(sample) ||
            predDataMap.get(sample.toLowerCase()) ||
            predDataMap.get(sample.replace(/[^a-zA-Z0-9]/g, ''));

          const typePred = (samplePred?.typePrediction && samplePred.typePrediction !== 'NA' && samplePred.typePrediction !== 'None')
            ? samplePred.typePrediction
            : (pred?.meta?.[0]?.type_predict && pred.meta[0].type_predict !== 'NA' && pred.meta[0].type_predict !== 'None'
              ? pred.meta[0].type_predict
              : undefined);

          const subtypePred = (samplePred?.subtypePrediction && samplePred.subtypePrediction !== 'NA' && samplePred.subtypePrediction !== 'None')
            ? samplePred.subtypePrediction
            : (pred?.meta?.[0]?.subtype_predict && pred.meta[0].subtype_predict !== 'NA' && pred.meta[0].subtype_predict !== 'None'
              ? pred.meta[0].subtype_predict
              : undefined);

          let hoverLabel: string | undefined;
          if (isSubtype) {
            const { typeName, subtypeName } = formatSubtypeName(typePred, subtypePred);
            if (typeName && subtypeName) {
              hoverLabel = typeName.toLowerCase() === subtypeName.toLowerCase() ? typeName : `${typeName} - ${subtypeName}`;
            } else if (subtypeName) {
              hoverLabel = subtypeName;
            } else if (typeName) {
              hoverLabel = typeName;
            }
          } else {
            if (typePred) {
              hoverLabel = getDiseaseDisplayName(typePred);
            }
          }

          if (hoverLabel) {
            userText.push(`${sample} (${hoverLabel})`);
          } else {
            userText.push(sample);
          }
        }

        traces.push({
          x: userX,
          y: userY,
          text: userText,
          type: 'scattergl',
          mode: 'markers',
          name: 'Your Samples',
          marker: {
            size: 8,
            color: '#e74c3c',
            symbol: 'diamond',
            line: {
              color: '#2c3e50',
              width: 2,
            },
          },
          hoverinfo: 'text',
        });
      }

      const layout = {
        title: mode === 'explore' ? 'UMAP Projection of TCGA Samples' : 'UMAP Projection of TCGA & User Samples',
        xaxis: { title: 'UMAP 1', gridcolor: '#f0f0f0' },
        yaxis: { title: 'UMAP 2', gridcolor: '#f0f0f0' },
        hovermode: 'closest',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 900,
        width: 1100,
        legend: {
          orientation: 'h',
          y: 1,
          x: 1
        },
      };

      const config = { responsive: true };
      Plotly.newPlot(div, traces, layout, config);

      // Setup resize observer
      if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          if (div.checkVisibility()) {
            Plotly.Plots.resize(div);
          }
        });
        this.resizeObserver.observe(div);
      }
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    const div = this.plotDiv()?.nativeElement;
    if (div) {
      Plotly.purge(div);
    }
  }

  downloadPlot(format: 'png' | 'jpeg' | 'svg'): void {
    const el = this.plotDiv()?.nativeElement;
    if (el) {
      Plotly.downloadImage(el, {
        format: format,
        filename: 'umap_plot_' + Date.now(),
        width: 800,
        height: 600
      });
    }
  }
}
