import {Component, computed, effect, ElementRef, inject, input, model, OnDestroy, viewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {capitalize} from "lodash";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";

declare const Plotly: any;

@Component({
  selector: 'app-disease-similarity',
  imports: [
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: './disease-similarity.component.html',
  styleUrl: './disease-similarity.component.scss'
})
export class DiseaseSimilarityComponent implements OnDestroy {
  browseService = inject(BrowseService);
  mode$ = model<'scatter' | 'heatmap'>('scatter');
  refreshSignal = input.required<any>();
  plotDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('plot');
  heatmapDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');

  data$ = this.browseService.networkResults$;
  plotData$ = computed(() => {
    const data = this.data$();
    if (!data) return;
    const mode = this.mode$();
    if (mode == 'scatter') {
      const scatterData = data.type.euclidean_distances;

      return [{
        x: scatterData.x,
        y: scatterData.y,
        type: 'scatter',
        mode: 'markers',
        text: scatterData.labels.map(label => capitalize(label))
      }];
    } else {
      const heatmapData = data.type.scores;

      return [{
        z: heatmapData.values,
        type: 'heatmap',
        x: heatmapData.labels.map(label => capitalize(label)),
        y: heatmapData.labels.map(label => capitalize(label)),
      }]
    }
  });


  updatePlot = effect(() => {
    const plotData = this.plotData$();
    if (!plotData) return;
    const div = this.plotDiv$().nativeElement;

    Plotly.newPlot(div, plotData, {
      height: 700,
      yaxis: {automargin: true},
      xaxis: {automargin: true},
      title: this.mode$() == 'scatter' ? 'Euclidean Distances' : 'Similarity Heatmap'
    });
  });

  refreshEffect = effect(() => {
    this.refreshSignal();
    this.refresh();
  });

  refresh() {
    const div = this.plotDiv$().nativeElement;

    if (div.checkVisibility()) {
      Plotly.Plots.resize(div);
    }
  }

  ngOnDestroy() {
    Plotly.purge(this.plotDiv$().nativeElement);
    Plotly.purge(this.heatmapDiv$().nativeElement);

    this.refreshEffect.destroy();
    this.updatePlot.destroy();
  }
}
