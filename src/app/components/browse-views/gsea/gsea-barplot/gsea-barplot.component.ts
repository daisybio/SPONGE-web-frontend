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
  selector: 'app-gsea-barplot',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './gsea-barplot.component.html',
  styleUrl: './gsea-barplot.component.scss',
})
export class GseaBarplotComponent implements OnDestroy {
  results = input.required<any>();
  refreshSignal = input.required<any>();
  barplot = viewChild.required<ElementRef<HTMLDivElement>>('barplot');

  plotUpdateEffect = effect(() => {
    const results = this.results();
    const plotElement = this.barplot();
    if (!results || !plotElement?.nativeElement) return;

    // Sort results by NES (Normalized Enrichment Score)
    const sortedResults = [...results].sort((a, b) => b.nes - a.nes);
    const terms = sortedResults.map((r) => r.term);
    const nes = sortedResults.map((r) => r.nes);
    const pvalues = sortedResults.map((r) => r.pvalue);

    // Create color array based on p-values
    const colors = pvalues.map((p) => (p < 0.05 ? '#2196F3' : '#9E9E9E'));

    const data = [
      {
        type: 'bar',
        x: nes,
        y: terms,
        orientation: 'h',
        marker: {
          color: colors,
        },
      },
    ];

    const layout = {
      title: 'Gene Set Enrichment Scores',
      xaxis: {
        title: 'Normalized Enrichment Score (NES)',
        automargin: true,
      },
      yaxis: {
        title: 'Gene Set',
        automargin: true,
      },
      height: Math.max(400, terms.length * 20), // Adjust height based on number of terms
      margin: {
        l: 200, // Increase left margin for term labels
      },
    };

    Plotly.newPlot(plotElement.nativeElement, data, layout);
  });

  // Add refresh effect
  refreshEffect = effect(() => {
    this.refreshSignal(); // Read the signal to track changes
    const plotElement = this.barplot();
    if (plotElement?.nativeElement?.checkVisibility()) {
      Plotly.Plots.resize(plotElement.nativeElement);
    }
  });

  ngOnDestroy(): void {
    const plotElement = this.barplot();
    if (plotElement?.nativeElement) {
      Plotly.purge(plotElement.nativeElement);
    }
    this.plotUpdateEffect.destroy();
    this.refreshEffect.destroy();
  }
}
