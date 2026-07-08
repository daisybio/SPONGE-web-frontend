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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PredictService } from '../service/predict.service';
import { InfoComponent } from '../../../../components/info/info.component';
import { capitalize } from 'lodash';
import { buildColorMap, getDiseaseDisplayName } from '../../../../cancer-colors';

declare var Plotly: any;

@Component({
  selector: 'app-umap-plot',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, InfoComponent],
  template: `
    <div style="padding: 16px;">
      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      } @else if (!hasData()) {
        <div class="card-container" style="padding: 24px; text-align: center; color: #666;">
          <p>No UMAP coordinates available. Please perform a prediction first.</p>
        </div>
      }

      <div style="width: 100%; overflow-x: auto;">
        <div #umapPlot style="width: 100%; height: auto; min-height: 650px;"></div>
      </div>

      <app-info type="panel">
        <p>
          This UMAP plot projects your uploaded samples (shown as large red diamonds)
          alongside reference TCGA samples (dots, colored by cancer type) using their SpongEffects enrichment scores.
          Points that are closer together have more similar ceRNA regulation profiles.
        </p>
        <p>
          SpongEffects scores are free of batch effects, allowing direct comparison of your custom samples
          with the reference TCGA cohort.
        </p>
      </app-info>
    </div>
  `,
})
export class UmapPlotComponent implements OnDestroy {
  predictService = inject(PredictService);
  plotDiv = viewChild.required<ElementRef<HTMLDivElement>>('umapPlot');

  isLoading = computed(() => this.predictService.isLoadingPrediction$());
  hasData = signal(false);

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const pred = this.predictService.prediction$();
      const div = this.plotDiv()?.nativeElement;
      if (!pred || !div) {
        this.hasData.set(false);
        if (div) Plotly.purge(div);
        return;
      }

      const user_umap = (pred as any).user_umap;
      const tcga_umap = (pred as any).tcga_umap;

      if (!user_umap || !tcga_umap || Object.keys(tcga_umap).length === 0) {
        this.hasData.set(false);
        Plotly.purge(div);
        return;
      }

      this.hasData.set(true);

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
          hoverinfo: 'text+name',
        });
      }

      // Add user traces
      const userX: number[] = [];
      const userY: number[] = [];
      const userText: string[] = [];

      for (const [sample, coords] of Object.entries(user_umap)) {
        const item = coords as any;
        userX.push(item.x);
        userY.push(item.y);
        userText.push(sample);
      }

      traces.push({
        x: userX,
        y: userY,
        text: userText,
        type: 'scatter',
        mode: 'markers',
        name: 'Your Samples',
        marker: {
          size: 14,
          color: '#e74c3c',
          symbol: 'diamond',
          line: {
            color: '#2c3e50',
            width: 2,
          },
        },
        hoverinfo: 'text',
      });

      const layout = {
        title: 'UMAP Projection of TCGA & User Samples',
        xaxis: { title: 'UMAP 1', gridcolor: '#f0f0f0' },
        yaxis: { title: 'UMAP 2', gridcolor: '#f0f0f0' },
        hovermode: 'closest',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 650,
        legend: {
          orientation: 'h',
          y: -0.15,
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
}
