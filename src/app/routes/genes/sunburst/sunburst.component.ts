import {Component, computed, effect, ElementRef, inject, input, viewChild} from '@angular/core';
import {Dataset, GeneCount} from "../../../interfaces";
import {capitalize} from "lodash";
import {toSignal} from "@angular/core/rxjs-interop";
import {fromEvent} from "rxjs";
import {VersionsService} from "../../../services/versions.service";

declare const Plotly: any;

@Component({
  selector: 'app-sunburst',
  imports: [],
  templateUrl: './sunburst.component.html',
  styleUrl: './sunburst.component.scss'
})
export class SunburstComponent {
  versionsService = inject(VersionsService);
  sunburst = viewChild.required<ElementRef<HTMLDivElement>>('sunburst');
  results = input.required<GeneCount[] | undefined>();
  datasets = this.versionsService.diseases$().value;
  onlySignificant = input.required<boolean>();

  plotData = computed(() => this.createSunburstData(this.results(), this.datasets(), this.onlySignificant()));
  windowResize = toSignal(fromEvent(window, 'resize'));

  constructor() {
    effect(() => {
      this.windowResize();
      this.resizePlot(this.sunburst().nativeElement);
    });

    effect(() => {
      const plotData = this.plotData();
      if (!plotData || plotData.labels.length === 1) return;

      const div = this.sunburst().nativeElement;

      Plotly.newPlot(div, [plotData], {
        margin: {t: 0, l: 0, r: 0, b: 0},
        height: 900,
      });
      this.resizePlot(div);
    });
  }

  private resizePlot(div: HTMLDivElement) {
    if (div.checkVisibility()) {
      Plotly.Plots.resize(div);
    }
  }

  private createSunburstData(results: GeneCount[] | undefined, datasets: Dataset[] | undefined, onlySignificant: boolean): any {
    if (!results || !datasets) {
      return;
    }
    const datasetCounts = results.reduce((acc, curr) => {
      if (!acc[curr.sponge_run.dataset.dataset_ID]) {
        acc[curr.sponge_run.dataset.dataset_ID] = {
          count: 0,
          dataset: datasets.find(d => d.dataset_ID === curr.sponge_run.dataset.dataset_ID)!
        };
      }
      acc[curr.sponge_run.dataset.dataset_ID].count += onlySignificant ? curr.count_sign : curr.count_all;
      return acc;
    }, {} as { [key: string]: { count: number, dataset: Dataset } });

    const diseaseCounts = Object.values(datasetCounts).reduce((acc, curr) => {
      if (!acc[curr.dataset.disease_name]) {
        acc[curr.dataset.disease_name] = 0;
      }
      acc[curr.dataset.disease_name] += curr.count;
      return acc;
    }, {} as { [key: string]: number });

    const total = Object.values(diseaseCounts).reduce((acc, curr) => acc + curr, 0);

    const labels = ["Diseases"].concat(Object.keys(diseaseCounts).map(d => capitalize(d)));
    const values = [total].concat(Object.values(diseaseCounts));
    const parents = ["", ...Object.keys(diseaseCounts).map(d => "Diseases")];

    for (let datasetCount of Object.values(datasetCounts)) {
      const subtype = datasetCount.dataset.disease_subtype || 'Unspecified';

      const count = datasetCount.count;
      const dataset = datasetCount.dataset;
      const parent = capitalize(dataset.disease_name);

      labels.push(subtype);
      values.push(count);
      parents.push(parent);
    }

    return {
      labels,
      values,
      parents,
      branchvalues: 'total',
      type: 'sunburst'
    }
  }

}
