import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { capitalize } from 'lodash';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { InfoComponent } from '../../info/info.component';

declare const Plotly: any;

@Component({
  selector: 'app-disease-similarity',
  imports: [MatButtonToggleGroup, MatButtonToggle, InfoComponent],
  templateUrl: './disease-similarity.component.html',
  styleUrl: './disease-similarity.component.scss',
})
export class DiseaseSimilarityComponent implements AfterViewInit, OnDestroy {
  browseService = input.required<BrowseService>();
  private resizeObserver?: ResizeObserver;
  mode$ = model<'scatter' | 'heatmap'>('scatter');
  refreshSignal = input.required<any>();
  plotDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('plot');
  heatmapDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');
  dataset = computed(() => this.browseService().disease$());

  data$ = computed(() => this.browseService().networkResults$());
  plotData$ = computed(() => {
    const data = this.data$();
    if (!data) return;
    const mode = this.mode$();
    if (mode == 'scatter') {
      const scatterData = data.type.euclidean_distances;

      const disease = this.dataset();
      const activeMask = scatterData.labels.map(
        (label) => disease?.disease_name == label
      );

      return [
        {
          x: scatterData.x.filter((_, i) => activeMask[i]),
          y: scatterData.y.filter((_, i) => activeMask[i]),
          type: 'scatter',
          mode: 'markers',
          name: 'Active',
          text: scatterData.labels
            .filter((_, i) => activeMask[i])
            .map(capitalize),
        },
        {
          x: scatterData.x.filter((_, i) => !activeMask[i]),
          y: scatterData.y.filter((_, i) => !activeMask[i]),
          type: 'scatter',
          mode: 'markers',
          name: 'Inactive',
          text: scatterData.labels
            .filter((_, i) => !activeMask[i])
            .map(capitalize),
        },
      ];
    } else {
      const heatmapData = data.type.scores;

      return [
        {
          z: heatmapData.values,
          type: 'heatmap',
          x: heatmapData.labels.map((label) => capitalize(label)),
          y: heatmapData.labels.map((label) => capitalize(label)),
        },
      ];
    }
  });

  updatePlot = effect(() => {
    const plotData = this.plotData$();
    if (!plotData) return;
    const div = this.plotDiv$().nativeElement;

    Plotly.newPlot(div, plotData, {
      autosize: true,
      height: 700,
      yaxis: { automargin: true },
      xaxis: { automargin: true },
      title:
        this.mode$() == 'scatter'
          ? 'Euclidean Distances'
          : 'Similarity Heatmap',
    }, { responsive: true });

    // Retry after render + tab switch time; guarantees final width.
    setTimeout(() => {
      try {
        if (!div.checkVisibility || div.checkVisibility()) {
          Plotly.Plots.resize(div);
        }
      } catch (err) {
        console.warn('Error resizing disease similarity plot:', err);
      }
    }, 100);
  });

  refreshEffect = effect(() => {
    this.refreshSignal();
    this.refresh();
  });

  ngAfterViewInit(): void {
    const div = this.plotDiv$().nativeElement;
    if (!div) return;

    this.resizeObserver = new ResizeObserver(() => {
      try {
        if (!div.checkVisibility || div.checkVisibility()) {
          Plotly.Plots.resize(div);
        }
      } catch (err) {
        console.warn('Error resizing disease similarity plot (ResizeObserver):', err);
      }
    });
    this.resizeObserver.observe(div);
  }

  refresh() {
    const div = this.plotDiv$().nativeElement;
    try {
      if (!div.checkVisibility || div.checkVisibility()) {
        Plotly.Plots.resize(div);
      }
    } catch (err) {
      console.warn('Error resizing disease similarity plot (refresh):', err);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    Plotly.purge(this.plotDiv$().nativeElement);
    //Plotly.purge(this.heatmapDiv$().nativeElement);

    this.refreshEffect.destroy();
    this.updatePlot.destroy();
  }
}
