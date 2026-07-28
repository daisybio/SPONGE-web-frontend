import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  resource,
  ResourceRef,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { capitalize } from 'lodash';

import { BackendService } from '../../services/backend.service';
import { VersionsService } from '../../services/versions.service';
import { Dataset, OverallCounts } from '../../interfaces';

declare const Plotly: any;

@Component({
  selector: 'app-new-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './new-home.component.html',
  styleUrl: './new-home.component.scss',
})
export class NewHomeComponent implements OnDestroy {
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);
  private router = inject(Router);

  plotDiv$ = viewChild<ElementRef<HTMLDivElement>>('plot');

  searchQuery = signal<string>('');
  selectedTab = signal<number>(0);

  version = this.versionsService.versionReadOnly();
  diseases = this.versionsService.diseases$();

  overallCountsGenes = resource({
    request: this.version,
    loader: (param) => this.backend.getOverallCounts(param.request, 'gene'),
  });

  overallCountsTranscripts = resource({
    request: this.version,
    loader: (param) => this.backend.getOverallCounts(param.request, 'transcript'),
  });

  // Computed real numbers derived directly from backend API responses
  totalSignificantInteractions = computed(() => {
    const genes = this.overallCountsGenes.value();
    const transcripts = this.overallCountsTranscripts.value();
    if (!genes && !transcripts) return '...';

    const sumGenes = genes?.reduce((acc: number, curr: OverallCounts) => acc + (curr.count_interactions_sign || 0), 0) || 0;
    const sumTranscripts = transcripts?.reduce((acc: number, curr: OverallCounts) => acc + (curr.count_interactions_sign || 0), 0) || 0;
    const total = sumGenes + sumTranscripts;
    return this.formatNumber(total);
  });

  totalPatientSamples = computed(() => {
    const dList = this.diseases.value();
    if (!dList || !dList.length) return '...';
    const sum = dList.reduce((acc: number, curr: Dataset) => acc + (curr.sample_count || 0), 0);
    return this.formatNumber(sum);
  });

  totalCancerTypes = computed(() => {
    const dList = this.diseases.value();
    if (!dList || !dList.length) return '...';
    const unique = new Set(dList.map((d: Dataset) => d.disease_name.toLowerCase()));
    return unique.size.toString();
  });

  totalCohorts = computed(() => {
    const dList = this.diseases.value();
    return dList ? dList.length.toString() : '...';
  });

  totalGeneInteractions = computed(() => {
    const genes = this.overallCountsGenes.value();
    if (!genes) return '...';
    const sum = genes.reduce((acc: number, curr: OverallCounts) => acc + (curr.count_interactions_sign || 0), 0);
    return this.formatNumber(sum);
  });

  totalTranscriptInteractions = computed(() => {
    const transcripts = this.overallCountsTranscripts.value();
    if (!transcripts) return '...';
    const sum = transcripts.reduce((acc: number, curr: OverallCounts) => acc + (curr.count_interactions_sign || 0), 0);
    return this.formatNumber(sum);
  });

  plotData$ = computed(() =>
    this.prepareData(
      this.overallCountsGenes.value(),
      this.overallCountsTranscripts.value()
    )
  );

  featuredDiseases = [
    { name: 'breast invasive carcinoma', code: 'BRCA', label: 'Breast Invasive Carcinoma' },
    { name: 'lung adenocarcinoma', code: 'LUAD', label: 'Lung Adenocarcinoma' },
    { name: 'colon adenocarcinoma', code: 'COAD', label: 'Colon Adenocarcinoma' },
    { name: 'prostate adenocarcinoma', code: 'PRAD', label: 'Prostate Adenocarcinoma' },
    { name: 'kidney renal clear cell carcinoma', code: 'KIRC', label: 'Kidney Renal Clear Cell' },
    { name: 'brain lower grade glioma', code: 'LGG', label: 'Brain Lower Grade Glioma' },
    { name: 'liver hepatocellular carcinoma', code: 'LIHC', label: 'Liver Hepatocellular' },
    { name: 'skin cutaneous melanoma', code: 'SKCM', label: 'Skin Cutaneous Melanoma' },
  ];

  updatePlotEffect = effect(() => {
    const tabIdx = this.selectedTab();
    const el = this.plotDiv$()?.nativeElement;
    const plotData = this.plotData$();
    if (tabIdx !== 2 || !el || !plotData) return;

    Plotly.newPlot(
      el,
      plotData,
      {
        title: {
          text: 'Number of significant interactions by cancer type and subtype',
          font: { color: '#1e293b', size: 16, family: 'Roboto, sans-serif' },
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#334155', family: 'Roboto, sans-serif' },
        xaxis1: {
          type: 'log',
          title: 'Number of interactions (log)',
          domain: [0, 1],
          gridcolor: 'rgba(0, 0, 0, 0.08)',
          zerolinecolor: 'rgba(0, 0, 0, 0.15)',
        },
        yaxis1: {
          automargin: true,
          tickfont: {
            size: 12,
            color: '#1e293b',
            fontWeight: '600',
          },
          ticklabelposition: 'outside',
          gridcolor: 'rgba(0, 0, 0, 0.05)',
        },
        margin: {
          l: 240,
          r: 20,
          t: 60,
          b: 40,
        },
        barmode: 'overlay',
        showlegend: true,
        legend: {
          x: 0.5,
          y: 1.02,
          xanchor: 'center',
          yanchor: 'bottom',
          orientation: 'h',
          font: { color: '#334155' },
        },
      },
      { responsive: true, displayModeBar: false }
    );
  });

  constructor() {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const div = this.plotDiv$()?.nativeElement;
        if (div && div.checkVisibility()) {
          Plotly.Plots.resize(div);
        }
      });
  }

  ngOnDestroy() {
    const el = this.plotDiv$()?.nativeElement;
    if (el) {
      Plotly.purge(el);
    }
  }

  navigateTo(path: string, queryParams?: any) {
    this.router.navigate([path], { queryParams });
  }

  onSearchSubmit() {
    const query = this.searchQuery().trim();
    if (!query) return;
    if (query.startsWith('ENSG') || query.startsWith('ENST') || query.length <= 6) {
      this.navigateTo('/genes-transcripts', { search: query });
    } else {
      this.navigateTo('/browse', { disease: query });
    }
  }

  selectDisease(diseaseName: string) {
    this.versionsService.selectedDiseaseName$.set(diseaseName);
    this.navigateTo('/browse');
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'k';
    }
    return num.toLocaleString();
  }

  private prepareData(
    geneCounts: OverallCounts[] | undefined,
    transcriptCounts: OverallCounts[] | undefined
  ) {
    if (!geneCounts || !transcriptCounts) {
      return undefined;
    }

    const geneCountsCopy = [...geneCounts];
    const transcriptCountsCopy = [...transcriptCounts];

    const sortFn = (a: OverallCounts, b: OverallCounts) => {
      const nameComp = a.disease_name.localeCompare(b.disease_name);
      if (nameComp !== 0) return nameComp;
      return (a.disease_subtype || '').localeCompare(b.disease_subtype || '');
    };

    // Sort Z to A so in horizontal bar chart (bottom to top), A is at the top
    geneCountsCopy.sort((a, b) => sortFn(b, a));

    const transcriptMap = new Map<string, number>();
    transcriptCountsCopy.forEach((t) => {
      const key = `${t.disease_name}__${t.disease_subtype || 'Unspecific'}`;
      transcriptMap.set(key, t.count_interactions_sign);
    });

    const cancerSubtypes: string[] = [];
    const x_values_genes: number[] = [];
    const x_values_transcripts: number[] = [];

    geneCountsCopy.forEach((g) => {
      const key = `${g.disease_name}__${g.disease_subtype || 'Unspecific'}`;
      const label = `${capitalize(g.disease_name)} - ${g.disease_subtype || 'Unspecific'}`;
      cancerSubtypes.push(label);
      x_values_genes.push(g.count_interactions_sign);
      x_values_transcripts.push(transcriptMap.get(key) || 0);
    });

    const data = [
      {
        type: 'bar',
        y: cancerSubtypes,
        x: x_values_transcripts,
        hovertemplate: '<b>%{y}</b><br>%{x:.2s} Transcript-transcript interactions<extra></extra>',
        marker: {
          color: '#137FFBA6',
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
        hovertemplate: '<b>%{y}</b><br>%{x:.2s} Gene-gene interactions<extra></extra>',
        marker: {
          color: '#eee6528b',
        },
        name: 'Gene interactions',
        orientation: 'h',
        xaxis: 'x1',
        yaxis: 'y1',
      },
    ];

    return data;
  }
}
