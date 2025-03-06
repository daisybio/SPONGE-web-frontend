import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Dataset, GeneCount } from '../../../interfaces';
import { capitalize } from 'lodash';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { VersionsService } from '../../../services/versions.service';
import { SUBTYPE_DEFAULT } from '../../../constants';

declare const Plotly: any;

@Component({
  selector: 'app-sunburst',
  imports: [],
  templateUrl: './sunburst.component.html',
  styleUrl: './sunburst.component.scss',
})
export class SunburstComponent {
  versionsService = inject(VersionsService);
  sunburst = viewChild.required<ElementRef<HTMLDivElement>>('sunburst');
  results = input.required<GeneCount[] | undefined>();
  refresh = input<any>();
  datasets = this.versionsService.diseases$().value;
  onlySignificant = input.required<boolean>();

  plotData = computed(() =>
    this.createSunburstData(
      this.results(),
      this.datasets(),
      this.onlySignificant()
    )
  );
  windowResize = toSignal(fromEvent(window, 'resize'));

  plotResize = effect(async () => {
    this.windowResize();
    this.refresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.resizePlot(this.sunburst().nativeElement);
  });

  plotDataChange = effect(() => {
    const plotData = this.plotData();
    const div = this.sunburst().nativeElement;

    if (!plotData || plotData.labels.length === 1) {
      Plotly.purge(div);
      return;
    }

    Plotly.newPlot(div, [plotData], {
      margin: { t: 0, l: 0, r: 0, b: 0 },
      height: 900,
    });
    this.resizePlot(div);
  });

  private resizePlot(div: HTMLDivElement) {
    if (div.checkVisibility()) {
      Plotly.Plots.resize(div);
    }
  }

  private createSunburstData(
    results: GeneCount[] | undefined,
    datasets: Dataset[] | undefined,
    onlySignificant: boolean
  ): any {
    if (!results || !datasets) {
      return undefined;
    }

    // Get the full dataset objects by matching the dataset_IDs
    const datasetCounts = results.reduce((acc, curr) => {
      if (!acc[curr.sponge_run.dataset.dataset_ID]) {
        acc[curr.sponge_run.dataset.dataset_ID] = {
          count: 0,
          dataset: datasets.find(
            (d) => d.dataset_ID === curr.sponge_run.dataset.dataset_ID
          )!,
        };
      }
      acc[curr.sponge_run.dataset.dataset_ID].count += onlySignificant
        ? curr.count_sign
        : curr.count_all;
      return acc;
    }, {} as { [key: number]: { count: number; dataset: Dataset } });

    // Sum up the counts for each disease_name
    const diseaseCounts = Object.values(datasetCounts).reduce((acc, curr) => {
      if (!acc[curr.dataset.disease_name]) {
        acc[curr.dataset.disease_name] = 0;
      }
      acc[curr.dataset.disease_name] += curr.count;
      return acc;
    }, {} as { [key: string]: number });

    // Calculate the sum across all diseases
    const total = Object.values(diseaseCounts).reduce(
      (acc, curr) => acc + curr,
      0
    );

    const diseaseOrder = Object.keys(diseaseCounts).sort(
      (a, b) => diseaseCounts[b] - diseaseCounts[a]
    );
    const ids = ['Diseases'].concat(diseaseOrder);
    const labels = ['Diseases'].concat(diseaseOrder.map((d) => capitalize(d)));
    const values = [total].concat(diseaseOrder.map((d) => diseaseCounts[d]));
    const parents = ['', ...diseaseOrder.map((d) => 'Diseases')];

    for (let datasetCount of Object.values(datasetCounts)) {
      const subtype = datasetCount.dataset.disease_subtype || SUBTYPE_DEFAULT;

      const count = datasetCount.count;
      const dataset = datasetCount.dataset;

      ids.push(`${dataset.disease_name}-${subtype}`);
      labels.push(subtype);
      values.push(count);
      parents.push(dataset.disease_name);
    }

    return {
      ids,
      labels,
      values,
      parents,
      branchvalues: 'total',
      type: 'sunburst',
    };
  }

  noData = computed(() => {
    const data = this.plotData();
    return !data || data.labels.length <= 1;
  });
}
