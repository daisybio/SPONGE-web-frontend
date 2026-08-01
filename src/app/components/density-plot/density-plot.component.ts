import {
  Component, computed, effect, ElementRef, input, model, viewChild,
  AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InfoComponent } from '../info/info.component';
import { hexToRgba } from '../../cancer-colors';

declare var Plotly: any;

/** A single filled density line (KDE / precomputed distribution). */
export interface DensityCurve {
  x: number[];
  y: number[];
  color: string;
  /** Explicit rgba fill; otherwise derived from `color` + `fillOpacity`. */
  fillColor?: string;
  fillOpacity?: number;
  lineWidth?: number;
  /** Legend label; defaults to the row label. */
  legendName?: string;
  legendGroup?: string;
  showInLegend?: boolean;
  /** Bold prefix used by the default hover template. */
  hoverName?: string;
  /** Full override of the hover template (else "<name> / Score / Density"). */
  hoverTemplate?: string;
}

/** Rug markers (individual score ticks) drawn on the x-axis of a row. */
export interface DensityRug {
  x: number[];
  color: string;
  labels?: string[];
  legendGroup?: string;
  hoverTemplate?: string;
}

/**
 * One class/group. In combined mode every row is overlaid on a single axis (drawn in array
 * order, so put highlight rows last). In stacked (ridgeline) mode every row is its own subplot,
 * labelled with an annotation.
 */
export interface DensityRow {
  key: string;
  label: string;
  color: string;
  curves: DensityCurve[];
  rug?: DensityRug[];
}

export interface DensityPlotConfig {
  title: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  /** Show y-axis (density) tick labels + title in combined mode. */
  showYTicks?: boolean;
  combinedHeight?: number;
  stackedRowHeight?: number;
  xRange?: [number, number];
  downloadFilename?: string;
}

/**
 * Shared density-distribution plot used by the SpongEffects Compute (classification) and Explore
 * (enrichment-class) score-distribution views. Consumers prepare a list of {@link DensityRow}s and
 * a {@link DensityPlotConfig}; this component renders the Plotly figure (combined overlay or
 * stacked ridgeline), owns the Combined/Stacked toggle, the download menu, hover, and resizing,
 * and projects the page-specific "What does this mean?" text via <ng-content>.
 */
@Component({
  selector: 'app-density-plot',
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    InfoComponent,
  ],
  templateUrl: './density-plot.component.html',
  styleUrl: './density-plot.component.scss',
})
export class DensityPlotComponent implements AfterViewInit, OnDestroy {
  rows = input<DensityRow[]>([]);
  config = input.required<DensityPlotConfig>();
  loading = input<boolean>(false);
  /** Two-way: Combined (overlay) vs Stacked (ridgeline). */
  combined = model<boolean>(true);
  refreshSignal$ = input<any>();

  plotDiv = viewChild<ElementRef<HTMLDivElement>>('densityPlot');
  hasData = computed(() => (this.rows()?.length ?? 0) > 0);

  private resizeObserver: ResizeObserver | null = null;
  private wasHiddenWhenBuilt = false;

  // Re-render whenever the data, mode, or config changes (but not while the parent is loading).
  private renderEffect = effect(() => {
    const rows = this.rows();
    const combined = this.combined();
    const config = this.config();
    if (this.loading()) return;
    this.render(rows, combined, config);
  });

  private refreshEffect = effect(() => {
    this.refreshSignal$();
    this.resize();
  });

  ngAfterViewInit() {
    const el = this.plotDiv()?.nativeElement;
    if (el) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(el);
    }
    setTimeout(() => this.resize(), 100);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    const el = this.plotDiv()?.nativeElement;
    if (el) Plotly.purge(el);
  }

  private render(rows: DensityRow[], combined: boolean, config: DensityPlotConfig) {
    const el = this.plotDiv()?.nativeElement;
    if (!el) return;
    if (!rows.length) { Plotly.purge(el); return; }

    const isVisible = !!(el.offsetWidth > 0 && el.offsetHeight > 0 && (el.checkVisibility ? el.checkVisibility() : true));
    this.wasHiddenWhenBuilt = !isVisible;

    const allX = rows.flatMap(r => r.curves.flatMap(c => c.x)).filter(v => !isNaN(v));
    const xRange: [number, number] = config.xRange ?? [
      allX.length ? Math.floor(Math.min(...allX)) : -5,
      allX.length ? Math.ceil(Math.max(...allX)) : 5,
    ];
    const xAxisTitle = config.xAxisTitle ?? 'SpongEffects Enrichment Score';
    const yAxisTitle = config.yAxisTitle ?? 'Density';

    const traces: any[] = [];
    const annotations: any[] = [];
    const axisEntries: { xKey: string; yKey: string; xRef: string; yRef: string }[] = [];

    rows.forEach((row, index) => {
      const xRef = combined ? 'x' : (index === 0 ? 'x' : `x${index + 1}`);
      const yRef = combined ? 'y' : (index === 0 ? 'y' : `y${index + 1}`);
      const xKey = combined ? 'xaxis' : (index === 0 ? 'xaxis' : `xaxis${index + 1}`);
      const yKey = combined ? 'yaxis' : (index === 0 ? 'yaxis' : `yaxis${index + 1}`);
      if (!combined) axisEntries.push({ xKey, yKey, xRef, yRef });

      for (const curve of row.curves) {
        traces.push({
          x: curve.x, y: curve.y, xaxis: xRef, yaxis: yRef,
          type: 'scatter', mode: 'lines', fill: 'tozeroy',
          fillcolor: curve.fillColor ?? hexToRgba(curve.color, curve.fillOpacity ?? 0.4),
          opacity: 1,
          line: { color: curve.color, width: curve.lineWidth ?? 1.5 },
          name: curve.legendName ?? row.label,
          legendgroup: curve.legendGroup ?? row.key,
          showlegend: !!curve.showInLegend,
          hovertemplate: curve.hoverTemplate ??
            `<b>${curve.hoverName ?? row.label}</b><br>Score: %{x:.3f}<br>Density: %{y:.4f}<extra></extra>`,
        });
      }

      for (const rug of (row.rug ?? [])) {
        traces.push({
          x: rug.x, y: rug.x.map(() => 0), xaxis: xRef, yaxis: yRef,
          type: 'scatter', mode: 'markers',
          marker: { color: rug.color, symbol: 'line-ns', size: 10, line: { color: rug.color, width: 1.5 } },
          name: '', legendgroup: rug.legendGroup ?? row.key, showlegend: false,
          customdata: rug.labels,
          hovertemplate: rug.hoverTemplate ?? `<b>Module: %{customdata}</b><br>Score: %{x:.4f}<extra></extra>`,
        });
      }

      if (!combined) {
        const maxY = Math.max(0, ...row.curves.flatMap(c => c.y).filter(v => !isNaN(v)));
        annotations.push({
          xref: xRef, yref: yRef,
          x: xRange[0] + 1.5, y: maxY / 2,
          text: row.label, align: 'left', showarrow: false,
          xanchor: 'left', yanchor: 'middle', width: 250,
        });
      }
    });

    if (combined) axisEntries.push({ xKey: 'xaxis', yKey: 'yaxis', xRef: 'x', yRef: 'y' });

    const layout: any = {
      showlegend: traces.some(t => t.showlegend),
      autosize: true,
      height: combined
        ? (config.combinedHeight ?? 500)
        : Math.max(400, rows.length * (config.stackedRowHeight ?? 160)),
      title: { text: config.title, font: { size: 14 } },
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      legend: { orientation: 'h', x: 0.5, y: -1.5, xanchor: 'center' },
      margin: { t: 80, b: 70, l: 60, r: 40 },
      annotations,
    };
    if (!combined) {
      layout.grid = { rows: rows.length, columns: 1, pattern: 'independent', roworder: 'bottom to top' };
    }

    axisEntries.forEach((ax, idx) => {
      const showX = combined || idx === 0;
      layout[ax.xKey] = {
        range: xRange, showgrid: true, zeroline: true, showticklabels: showX,
        ...(showX ? { title: { text: xAxisTitle, font: { size: 11 } }, automargin: true } : {}),
      };
      const showY = combined && (config.showYTicks ?? false);
      layout[ax.yKey] = {
        showgrid: true, zeroline: true, automargin: true, showticklabels: showY,
        ...(showY ? { title: { text: yAxisTitle, font: { size: 11 } } } : {}),
      };
    });

    Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false }).then(() => {
      // The first paint can happen before the container has its final width (e.g. the tab isn't
      // fully laid out yet), which pushes the horizontal legend over the plot on Explore/combined.
      // A deferred resize recomputes margins + legend wrapping at the real size.
      setTimeout(() => {
        const cur = this.plotDiv()?.nativeElement;
        if (cur && (cur.checkVisibility ? cur.checkVisibility() : true)) {
          Plotly.Plots.resize(cur);
        }
      }, 0);
    });
  }

  private resize() {
    const el = this.plotDiv()?.nativeElement;
    if (!el) return;
    const isVisible = !!(el.offsetWidth > 0 && el.offsetHeight > 0 && (el.checkVisibility ? el.checkVisibility() : true));
    if (!isVisible) return;
    if (this.wasHiddenWhenBuilt) {
      this.wasHiddenWhenBuilt = false;
      Plotly.relayout(el, { autosize: true }).then(() => Plotly.Plots.resize(el));
    } else {
      Plotly.Plots.resize(el);
    }
  }

  downloadPlot(format: 'png' | 'jpeg' | 'svg'): void {
    const el = this.plotDiv()?.nativeElement;
    if (!el) return;
    Plotly.downloadImage(el, {
      format,
      filename: (this.config().downloadFilename ?? 'density_plot') + '_' + Date.now(),
      width: 800,
      height: 600,
    });
  }
}
