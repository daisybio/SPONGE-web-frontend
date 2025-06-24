import {
  Component,
  ElementRef,
  OnDestroy,
  input,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

declare const Plotly: any;

@Component({
  selector: 'app-gsea-volcanoplot',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './gsea-volcanoplot.component.html',
  styleUrl: './gsea-volcanoplot.component.scss',
})
export class GseaVolcanoplotComponent implements OnDestroy {
  results = input.required<any>();
  refreshSignal = input.required<any>();
  volcanoplot = viewChild.required<ElementRef<HTMLDivElement>>('volcanoplot');

  plotUpdateEffect = effect(() => {
    const results = this.results();
    const plotElement = this.volcanoplot();
    if (!results || !plotElement?.nativeElement) return;

    const nes = results.map((r: any) => r.nes);
    const fwerpValues = results.map((r: any) => r.fwerp);
    const terms = results.map((r: any) => r.term);

    // Transform FWERP values to -log10 scale
    const logFWERP = fwerpValues.map((p: number) => -Math.log10(p + 0.01));

    // Create color array based on significance and NES direction
    const colors = results.map((r: any) => {
      if (r.fwerp >= 0.05) return '#9E9E9E'; // Not significant
      return r.nes > 0 ? '#FF5252' : '#2196F3'; // Red for positive NES, blue for negative
    });

    const data = [
      {
        type: 'scatter',
        mode: 'markers',
        x: nes,
        y: logFWERP,
        text: terms,
        marker: {
          color: colors,
          size: 10,
        },
        hovertemplate:
          '<b>%{text}</b><br>' +
          'NES: %{x:.2f}<br>' +
          'FWERP: %{customdata:.2e}' +
          '<extra></extra>',
        customdata: fwerpValues,
      },
    ];

    const layout = {
      title: 'GSEA Volcano Plot',
      xaxis: {
        title: 'Normalized Enrichment Score (NES)',
        zeroline: true,
        zerolinecolor: '#969696',
        gridcolor: '#bdbdbd',
        gridwidth: 1,
      },
      yaxis: {
        title: '-log10(FWERP)',
        gridcolor: '#bdbdbd',
        gridwidth: 1,
      },
      // Add significance threshold line
      shapes: [
        {
          type: 'line',
          y0: -Math.log10(0.05),
          y1: -Math.log10(0.05),
          x0: Math.min(...nes),
          x1: Math.max(...nes),
          line: {
            color: '#969696',
            width: 1,
            dash: 'dash',
          },
        },
      ],
      showlegend: false,
    };

    Plotly.newPlot(plotElement.nativeElement, data, layout);
  });

  // Add refresh effect
  refreshEffect = effect(() => {
    this.refreshSignal(); // Read the signal to track changes
    const plotElement = this.volcanoplot();
    if (plotElement?.nativeElement?.checkVisibility()) {
      Plotly.Plots.resize(plotElement.nativeElement);
    }
  });

  ngOnDestroy(): void {
    const plotElement = this.volcanoplot();
    if (plotElement?.nativeElement) {
      Plotly.purge(plotElement.nativeElement);
    }
    this.plotUpdateEffect.destroy();
    this.refreshEffect.destroy();
  }
}
