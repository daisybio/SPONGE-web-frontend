import {
  Component,
  computed,
  effect,
  ElementRef,
  OnDestroy,
  Resource,
  resource,
  ResourceRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CarouselComponent, SlideComponent } from 'ngx-bootstrap/carousel';
import { BackendService } from '../../services/backend.service';
import { Dataset, OverallCounts } from '../../interfaces';
import { VersionsService } from '../../services/versions.service';
import { fromEvent } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { capitalize } from 'lodash';
import { Router } from '@angular/router';

declare const Plotly: any;

@Component({
  selector: 'app-home',
  imports: [FormsModule, CarouselComponent, SlideComponent, MatProgressSpinner, MatCardModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnDestroy {
  plotDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('plot');

  overallCountsGenes: ResourceRef<OverallCounts[] | undefined>;
  overallCountsTranscripts: ResourceRef<OverallCounts[] | undefined>;
  diseases: Resource<Dataset[] | undefined>;

  plotData$ = computed(() =>
    this.prepareData(
      this.overallCountsGenes.value(),
      this.overallCountsTranscripts.value()
    )
  );

  updatePlotEffect = effect(() => {
    const div = this.plotDiv$().nativeElement;
    const plotData = this.plotData$();
    if (!plotData) {
      return;
    }

    Plotly.newPlot(div, plotData,
      {
        title: 'Number of significant interactions by cancer type and subtype',
        xaxis1: {
          type: 'log',
          title: 'Number of interactions (log)',
          domain: [0, 1],
        },
        yaxis1: {
          automargin: true,
          tickfont: {
            size: 14,
            color: 'white',
            fontWeight: 'bold',
          },
          ticklabelposition: 'inside',
        },
        margin: {
          l: 0,
          r: 0,
        },
        barmode: 'overlay',
        showlegend: true,
        legend: {
          x: 0.5,
          y: 1,
          xanchor: 'center',
          yanchor: 'bottom',
          orientation: 'h',
        },
      });
  });

  constructor(
    private backend: BackendService,
    versionsService: VersionsService,
    private router: Router,
  ) {
    const version = versionsService.versionReadOnly();
    this.diseases = versionsService.diseases$();

    this.overallCountsGenes = resource({
      request: version,
      loader: (param) => this.backend.getOverallCounts(param.request, 'gene'),
    });

    this.overallCountsTranscripts = resource({
      request: version,
      loader: (param) => this.backend.getOverallCounts(param.request, 'transcript'),
    });

    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const div = this.plotDiv$().nativeElement;
        if (div.checkVisibility()) {
          Plotly.Plots.resize(div);
        }
      });
  }

  ngOnDestroy() {
    Plotly.purge(this.plotDiv$().nativeElement);
    this.updatePlotEffect.destroy();
  }

  prepareData(
    geneCounts: OverallCounts[] | undefined,
    transcriptCounts: OverallCounts[] | undefined
  ) {
    if (!geneCounts || !transcriptCounts) {
      return undefined;
    }

    const countField = 'count_interactions_sign';

    const x_values_genes = geneCounts.map(cancerCount => cancerCount.count_interactions_sign);
    const x_values_transcripts = transcriptCounts.map(cancerCount => cancerCount.count_interactions_sign);

    // sort geneCounts and transcriptCounts by cancer name, from top to bottom
    geneCounts.sort((b, a) => a.disease_name.localeCompare(b.disease_name));
    transcriptCounts.sort((b, a) => a.disease_name.localeCompare(b.disease_name));

    const cancerNames: string[] = geneCounts.map(cancerCount => cancerCount.disease_name).map(name => name.toUpperCase());
    // assert that the transcript counts have the same disease names
    const transcriptNames: string[] = transcriptCounts.map(cancerCount => cancerCount.disease_name).map(name => name.toUpperCase());
    console.assert(JSON.stringify(cancerNames) === JSON.stringify(transcriptNames), 'Disease names do not match');

    const cancerSubtypes: string[] = geneCounts.map(cancerCount => capitalize(cancerCount.disease_name) + " - " + (cancerCount.disease_subtype || "Unspecific"));
    const transcriptSubtypes: string[] = transcriptCounts.map(cancerCount => capitalize(cancerCount.disease_name) + " - " + (cancerCount.disease_subtype || "Unspecific"));
    console.assert(JSON.stringify(cancerSubtypes) === JSON.stringify(transcriptSubtypes), 'Subtypes do not match');

    // Create traces
    var data = [
      {
        type: 'bar',
        y: cancerSubtypes,
        x: x_values_transcripts,
        hovertemplate: '%{x:.2s} Transcript-transcript interactions<extra></extra>',
        marker: {
          color: '#137FFBA6',  // '#0D50B0', '#eeca52aa', // '
        },
        name: 'Transcript interactions',
        orientation: 'h',
        xaxis: 'x1',
        yaxis: 'y1',
      },
      {
        type: 'bar',
        y: cancerSubtypes,
        x: x_values_genes,
        // base: x_values_genes.map(x => shift - x), // butterfly plot
        hovertemplate: '%{x:.2s} Gene-gene interactions<extra></extra>',
        marker: {
          color: '#eee6528b', // '#FF557680', // '#fb8f1380'  // '#EBFF49aa', //  '#0D50B0aa'  // '#08203B'
        },
        name: 'Gene interactions',
        orientation: 'h',
        xaxis: 'x1',
        yaxis: 'y1',
      }
    ];

    return data
  }

  private getSubtypeColor(subtype: string, type: 'gene' | 'transcript'): string {
    // Generate color based on subtype name hash
    let hash = 0;
    for (let i = 0; i < subtype.length; i++) {
      hash = subtype.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    const saturation = type === 'gene' ? 70 : 50;
    const lightness = type === 'gene' ? 50 : 65;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}