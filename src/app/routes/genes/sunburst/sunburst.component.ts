import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Dataset, GeneCount, TranscriptCount } from '../../../interfaces';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { VersionsService } from '../../../services/versions.service';
import { SUBTYPE_DEFAULT } from '../../../constants';
import {
  getCancerTypeColor,
  getCancerSubtypeColor,
  getDiseaseDisplayName,
} from '../../../cancer-colors';

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
  results = input.required<GeneCount[] | TranscriptCount[] | undefined>();
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
      paper_bgcolor: 'rgba(0,0,0,0)',
    });
    this.resizePlot(div);
  });

  private resizePlot(div: HTMLDivElement) {
    if (div.checkVisibility()) {
      Plotly.Plots.resize(div);
    }
  }

  private createSunburstData(
    results: GeneCount[] | TranscriptCount[] | undefined,
    datasets: Dataset[] | undefined,
    onlySignificant: boolean
  ): any {
    if (!results || !datasets) {
      return undefined;
    }

    // Get the full dataset objects by matching the dataset_IDs
    const datasetCounts = results.reduce((acc, curr) => {
      const foundDataset = datasets.find(
        (d) => d.dataset_ID === curr.sponge_run.dataset.dataset_ID
      );
      if (!foundDataset) {
        return acc;
      }
      const count = onlySignificant ? curr.count_sign : curr.count_all;
      if (count <= 0) {
        return acc;
      }
      if (!acc[curr.sponge_run.dataset.dataset_ID]) {
        acc[curr.sponge_run.dataset.dataset_ID] = {
          count: 0,
          dataset: foundDataset,
        };
      }
      acc[curr.sponge_run.dataset.dataset_ID].count += count;
      return acc;
    }, {} as { [key: number]: { count: number; dataset: Dataset } });

    // Sum up the counts for each disease_name
    const diseaseCounts = Object.values(datasetCounts).reduce((acc, curr) => {
      if (curr.dataset && curr.dataset.disease_name) {
        if (!acc[curr.dataset.disease_name]) {
          acc[curr.dataset.disease_name] = 0;
        }
        acc[curr.dataset.disease_name] += curr.count;
      }
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

    const ids: string[] = ['Diseases'];
    const labels: string[] = ['Diseases'];
    const values: number[] = [total];
    const parents: string[] = [''];
    const colors: string[] = ['#ffffff'];

    for (const disease of diseaseOrder) {
      ids.push(disease);
      labels.push(getDiseaseDisplayName(disease));
      values.push(diseaseCounts[disease]);
      parents.push('Diseases');
      colors.push(getCancerTypeColor(disease));
    }

    // Group subtype counts by disease and subtype
    const diseaseSubtypeCounts = new Map<string, Map<string, number>>();
    for (const dc of Object.values(datasetCounts)) {
      if (dc.dataset && dc.dataset.disease_name) {
        const disease = dc.dataset.disease_name;
        const subtype = dc.dataset.disease_subtype || SUBTYPE_DEFAULT;
        if (!diseaseSubtypeCounts.has(disease)) {
          diseaseSubtypeCounts.set(disease, new Map<string, number>());
        }
        const subMap = diseaseSubtypeCounts.get(disease)!;
        subMap.set(subtype, (subMap.get(subtype) ?? 0) + dc.count);
      }
    }

    for (const disease of diseaseOrder) {
      const subMap = diseaseSubtypeCounts.get(disease);
      if (!subMap) continue;

      const subtypes = Array.from(subMap.keys()).sort((a, b) => {
        if (a === SUBTYPE_DEFAULT) return 1;
        if (b === SUBTYPE_DEFAULT) return -1;
        return a.localeCompare(b);
      });

      subtypes.forEach((subtype, index) => {
        const count = subMap.get(subtype)!;
        const color =
          subtypes.length > 1
            ? getCancerSubtypeColor(disease, index, subtypes.length)
            : getCancerTypeColor(disease);

        ids.push(`${disease}-${subtype}`);
        labels.push(getDiseaseDisplayName(subtype));
        values.push(count);
        parents.push(disease);
        colors.push(color);
      });
    }

    return {
      ids,
      labels,
      values,
      parents,
      branchvalues: 'total',
      type: 'sunburst',
      marker: {
        colors,
        line: { width: 1, color: '#ffffff' },
      },
    };
  }

  noData = computed(() => {
    const data = this.plotData();
    return !data || data.labels.length <= 1;
  });
}
