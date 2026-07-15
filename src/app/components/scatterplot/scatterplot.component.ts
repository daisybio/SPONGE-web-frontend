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

  scatterplot = viewChild.required<ElementRef<HTMLDivElement>>('scatterplot');
  cartService = inject(CartService);

  private resizeObserver: ResizeObserver | null = null;

  // Resource-based data fetching
  scatterplotResource = resource({
    request: computed(() => {
      // Include refreshSignal$ to trigger reloads
      this.refreshSignal$();
      return {
        dataSource: this.dataSource(),
        params: this.params(),
        timestamp: Date.now(), // Force refresh
      };
    }),
    loader: async (param) => {
      const { dataSource, params } = param.request;

      try {
        // Fetch data using the data source
        const data = await dataSource.getData(params);

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

    const trace = {
      x: data.map((e) => e.x),
      y: data.map((e) => e.y),
      mode: 'markers',
      type: 'scatter',
      name: 'Modules',
      marker: {
        size: 8,
        color: 'rgba(31, 119, 180, 0.8)',
        line: { width: 1, color: 'rgba(255, 255, 255, 0.8)' },
      },
      text: data.map(
        (e) => `Module Center: ${e.id || 'N/A'}<br>X: ${e.x}<br>Y: ${e.y}<br>Click to add to cart`,
      ),
      customdata: data.map((e) => ({ ensemblID: e.ensemblID || e.id, symbol: e.id })),
      hoverinfo: 'text',
    };

    // add a diagonal line y=x for reference but without making the plot bigger
    const minVal_x = Math.min(...data.map((e) => e.x));
    const minVal_y = Math.min(...data.map((e) => e.y));
    const minVal = Math.max(minVal_x, minVal_y);
    const maxVal_x = Math.max(...data.map((e) => e.x));
    const maxVal_y = Math.max(...data.map((e) => e.y));
    const maxVal = Math.min(maxVal_x, maxVal_y);

    const lineTrace = {
      x: [minVal, maxVal],
      y: [minVal, maxVal],
      mode: 'lines',
      type: 'scatter',
      name: 'y=x',
      line: { dash: 'dashdot', width: 1, color: 'rgba(255, 127, 14, 0.8)' },
      hoverinfo: 'none',
    };
    const layout = {
      title: dataSource.getTitle ? dataSource.getTitle(params) : 'Scatterplot',
      xaxis: {
        title: dataSource.getXTitle ? dataSource.getXTitle() : 'X Axis',
        zeroline: false,
      },
      yaxis: {
        title: dataSource.getYTitle ? dataSource.getYTitle() : 'Y Axis',
        zeroline: false,
      },
      margin: { t: 50, r: 30, b: 50, l: 60 },
      hovermode: 'closest',
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      // legend inside figure with border
      legend: { x: 0.8, y: 0.9, bordercolor: 'black', borderwidth: 1 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    try {
      Plotly.newPlot(scatterplotEl, [trace, lineTrace], layout, config);
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
