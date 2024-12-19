import {Component, computed, effect, ElementRef, inject, input, OnDestroy, viewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {capitalize} from "lodash";

declare const Plotly: any;

@Component({
  selector: 'app-disease-distances',
  imports: [],
  templateUrl: './disease-distances.component.html',
  styleUrl: './disease-distances.component.scss'
})
export class DiseaseDistancesComponent implements OnDestroy {
  browseService = inject(BrowseService);

  refreshSignal = input.required<any>();
  scatterDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('scatter');
  heatmapDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');

  data$ = this.browseService.networkResults$;
  scatterData$ = computed(() => {
    const data = this.data$();
    if (!data) return;
    return data.type.euclidean_distances;
  });
  heatmapData$ = computed(() => {
    const data = this.data$();
    if (!data) return;
    return data.type.scores;
  });


  updateScatter = effect(() => {
    const scatterData = this.scatterData$();
    if (!scatterData) return;
    const div = this.scatterDiv$().nativeElement;

    Plotly.newPlot(div, [{
      x: scatterData.x,
      y: scatterData.y,
      type: 'scatter',
      mode: 'markers',
      text: scatterData.labels.map(label => capitalize(label)),
    }], {
      margin: {t: 0, l: 0, r: 0, b: 0},
      height: 500,
    });
  });

  refreshEffect = effect(() => {
    this.refreshSignal();

    this.refresh();
  });

  refresh() {
    const divs = [this.scatterDiv$().nativeElement, this.heatmapDiv$().nativeElement];

    for (const div of divs) {
      if (div.checkVisibility()) {
        Plotly.Plots.resize(div);
      }
    }
  }

  ngOnDestroy() {
    Plotly.purge(this.scatterDiv$().nativeElement);
    Plotly.purge(this.heatmapDiv$().nativeElement);

    this.refreshEffect.destroy();
    this.updateScatter.destroy();
  }
}
