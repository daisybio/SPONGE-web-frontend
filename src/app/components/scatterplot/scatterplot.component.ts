// Force dev server re-build
import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  resource,
  signal,
  viewChild,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CartService } from '../../services/cart.service';
import { Gene, Transcript } from '../../interfaces';

declare const Plotly: any;

export type ScatterplotDataScource = {
  getData: (params: any) => Promise<any[]>;
  transformData?: (data: any[]) => any[];
  getColorScale?: () => string;
  getTitle?: (params: any) => string;
  getXTitle?: () => string;
  getYTitle?: () => string;
};

@Component({
  selector: 'app-scatterplot',
  imports: [
    MatProgressBar,
    CommonModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './scatterplot.component.html',
  styleUrl: './scatterplot.component.scss',
})
export class ScatterplotComponent implements AfterViewInit, OnDestroy {
  // Inputs
  dataSource = input.required<ScatterplotDataScource>();
  params = input.required<any>();
  refreshSignal$ = input();

  plotRendered = output<void>();
  loadRemaining = output<void>();

  scatterplot = viewChild.required<ElementRef<HTMLDivElement>>('scatterplot');
  cartService = inject(CartService);

  private resizeObserver: ResizeObserver | null = null;

  showRemaining = signal<boolean>(false);

  isLoading = computed(() => {
    return this.scatterplotResource.isLoading() || !!this.params()?.isLoading;
  });

  async toggleRemaining() {
    const willShow = !this.showRemaining();
    this.showRemaining.set(willShow);
    if (willShow) {
      this.loadRemaining.emit();
    }
    const data = this.scatterplotResource.value();
    if (data && data.length > 0) {
      this.renderScatterplot(data);
    }
  }

  // Resource-based data fetching
  scatterplotResource = resource({
    params: computed(() => {
      // Include refreshSignal$ and showRemaining to trigger reloads
      this.refreshSignal$();
      this.showRemaining();
      return {
        dataSource: this.dataSource(),
        params: this.params(),
        timestamp: Date.now(),
      };
    }),
    loader: async (param) => {
      const { dataSource, params } = param.params;

      try {
        // Fetch data using the data source. Pass showRemaining so the source can decide
        // whether to compute values for all modules or just the top-N (consumers that don't
        // support "remaining" simply ignore the extra field).
        const data = await dataSource.getData({ ...params, showRemaining: this.showRemaining() });

        // Apply transformation if provided
        const transformedData = dataSource.transformData
          ? dataSource.transformData(data)
          : data;

        return transformedData;
      } catch (error) {
        console.error('Error loading scatterplot data:', error);
        throw error;
      }
    },
  });

  // Single effect to handle rendering
  private plotEffect = effect(() => {
    const data = this.scatterplotResource.value();
    const showRemaining = this.showRemaining();
    if (data && data.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.renderScatterplot(data);
        this.plotRendered.emit();
      }, 0);
    }
  });

  // Effect to handle resize
  private refreshEffect = effect(() => {
    this.refreshSignal$();
    // Keep this for manual triggers, but ResizeObserver handles most cases
    this.refresh();
  });

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => {
      this.refresh();
    });
    const el = this.scatterplot()?.nativeElement;
    if (el) {
      this.resizeObserver.observe(el);
    }
  }

  refresh() {
    const scatterplotEl = this.scatterplot()?.nativeElement;
    if (
      scatterplotEl &&
      scatterplotEl.checkVisibility &&
      scatterplotEl.checkVisibility()
    ) {
      try {
        Plotly.Plots.resize(scatterplotEl);
      } catch (error) {
        console.warn('Error resizing plot:', error);
      }
    }
  }

  ngOnDestroy(): void {
    const scatterplotEl = this.scatterplot()?.nativeElement;
    if (scatterplotEl) {
      try {
        Plotly.purge(scatterplotEl);
      } catch (error) {
        console.warn('Error purging plot:', error);
      }
    }
    this.resizeObserver?.disconnect();
    this.plotEffect?.destroy();
    this.refreshEffect?.destroy();
  }

  private renderScatterplot(data: any[]) {
    if (!data || data.length === 0) {
      console.warn('No data to render in scatterplot');
      return;
    }

    const scatterplotEl = this.scatterplot()?.nativeElement;
    if (!scatterplotEl) {
      console.error('Scatterplot element not found');
      return;
    }

    const dataSource = this.dataSource();
    const params = this.params();

    const redData = data.filter((e) => e.isTop !== false);
    const greyData = this.showRemaining() ? data.filter((e) => e.isTop === false) : [];

    const traces: any[] = [];

    if (greyData.length > 0) {
      traces.push({
        x: greyData.map((e) => e.x),
        y: greyData.map((e) => e.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Other Modules',
        marker: {
          size: 12,
          color: 'grey',
          opacity: 0.5,
        },
        text: greyData.map((e) => `${e.id}<br>Click to add to cart`),
        customdata: greyData.map((e) => ({ ensemblID: e.ensemblID || e.id, symbol: e.id })),
        hoverinfo: 'text',
      });
    }

    if (redData.length > 0) {
      traces.push({
        x: redData.map((e) => e.x),
        y: redData.map((e) => e.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Top Modules',
        marker: {
          size: 12,
          color: 'red',
          opacity: 1,
        },
        text: redData.map((e) => `${e.id}<br>Click to add to cart`),
        customdata: redData.map((e) => ({ ensemblID: e.ensemblID || e.id, symbol: e.id })),
        hoverinfo: 'text',
      });
    }

    const layout = {
      title: dataSource.getTitle ? dataSource.getTitle(params) : 'Centrality Scatterplot',
      showlegend: false,
      autosize: true,
      hovermode: 'closest',
      margin: { t: 30 },
      xaxis: {
        title: dataSource.getXTitle ? dataSource.getXTitle() : 'Mean TCGA Enrichment Score',
        zeroline: false,
      },
      yaxis: {
        title: dataSource.getYTitle ? dataSource.getYTitle() : 'Uploaded Samples Mean Enrichment Score',
        zeroline: false,
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    try {
      Plotly.newPlot(scatterplotEl, traces, layout, config);
      if (scatterplotEl) {
        (scatterplotEl as any).removeAllListeners?.('plotly_click');
        (scatterplotEl as any).on('plotly_click', (clickData: any) => {
          if (clickData?.points?.[0]) {
            const pt = clickData.points[0];
            const info = pt.customdata;
            if (info && info.ensemblID) {
              if (info.ensemblID.startsWith('ENSG')) {
                this.cartService.add({
                  ensg_number: info.ensemblID,
                  gene_symbol: info.symbol
                });
              } else {
                this.cartService.add({
                  enst_number: info.ensemblID,
                  gene: { ensg_number: '', gene_symbol: info.symbol || info.ensemblID }
                } as Transcript);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error rendering scatterplot:', error);
    }
  }

  downloadPlot(format: 'png' | 'jpeg' | 'svg'): void {
    const el = this.scatterplot()?.nativeElement;
    if (el) {
      Plotly.downloadImage(el, {
        format: format,
        filename: 'scatterplot_' + Date.now(),
        width: 800,
        height: 600
      });
    }
  }
}
