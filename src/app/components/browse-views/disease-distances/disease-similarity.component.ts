import {
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
import { VersionsService } from '../../../services/versions.service';
import { buildColorMap, getCancerTypeColor } from '../../../cancer-colors';

declare const Plotly: any;

@Component({
  selector: 'app-disease-similarity',
  imports: [MatButtonToggleGroup, MatButtonToggle, InfoComponent],
  templateUrl: './disease-similarity.component.html',
  styleUrl: './disease-similarity.component.scss',
})
export class DiseaseSimilarityComponent implements OnDestroy {
  browseService = input.required<BrowseService>();
  mode$ = model<'scatter' | 'heatmap'>('scatter');
  refreshSignal = input.required<any>();
  plotDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('plot');
  heatmapDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');
  dataset = computed(() => this.browseService().disease$());
  versionsService = inject(VersionsService)

  data$ = computed(() => this.browseService().networkResults$());
  plotData$ = computed(() => {
    const data = this.data$();
    if (!data) return;
    const mode = this.mode$();
    const disease = this.dataset();
    const allDiseases = this.versionsService.diseases$().value() || [];

    const isUnspecific = !disease || !disease.disease_subtype || disease.disease_subtype.toLowerCase() === 'unspecific';

    // 1. Determine which source data to use (type vs subtype)
    const sourceData: any = isUnspecific ? data.type : data.subtype;
    if (!sourceData) return;

    if (mode === 'scatter') {
      const scatterData = sourceData.euclidean_distances;
      if (!scatterData) return;

      let labels: string[] = [];
      let x: number[] = [];
      let y: number[] = [];

      if (isUnspecific) {
        labels = scatterData.labels;
        x = scatterData.x;
        y = scatterData.y;
      } else {
        const isTargetLabel = (label: string) => {
          if (!disease) return false;
          const l = label.toLowerCase();
          const dn = disease.disease_name.toLowerCase();
          if (l === dn) return true;
          const siblings = allDiseases.filter((d: { disease_name: string; }) => d.disease_name === disease.disease_name);
          return siblings.some((sib) => {
            const sub = sib.disease_subtype?.toLowerCase();
            if (!sub || sub === 'unspecific') return false;
            return l === sub || l.includes(sub) || sub.includes(l);
          });
        };

        scatterData.labels.forEach((label: string, idx: string | number) => {
          if (isTargetLabel(label)) {
            labels.push(label);
            x.push(scatterData.x[idx]);
            y.push(scatterData.y[idx]);
          }
        });
      }

      const activeLabel = isUnspecific ? disease?.disease_name : disease?.disease_subtype;
      const activeMask = labels.map(
        (label) => !!(activeLabel && label.toLowerCase() === activeLabel.toLowerCase())
      );

      // Global cancer-type colors: at type level each point takes its canonical type color;
      // at subtype level points take the parent type's subtype color family.
      const subtypeColorMap = isUnspecific
        ? {}
        : buildColorMap([...new Set(labels)], disease?.disease_name);
      const pointColor = (label: string) =>
        isUnspecific ? getCancerTypeColor(label) : (subtypeColorMap[label] ?? getCancerTypeColor(label));

      return [
        {
          x,
          y,
          type: 'scatter',
          mode: 'markers',
          showlegend: false,
          text: labels.map(capitalize),
          hoverinfo: 'text',
          marker: {
            color: labels.map(pointColor),
            // The active (selected) disease is emphasized with a larger marker and a dark ring
            // so it stands out regardless of its cancer-type fill color.
            size: activeMask.map((a) => (a ? 16 : 9)),
            line: {
              color: activeMask.map((a) => (a ? '#000000' : 'rgba(0,0,0,0.35)')),
              width: activeMask.map((a) => (a ? 2.5 : 0.5)),
            },
          },
        },
      ];
    } else {
      const heatmapData = sourceData.scores;
      if (!heatmapData) return;

      let labels: string[] = [];
      let values: number[][] = [];

      if (isUnspecific) {
        labels = heatmapData.labels;
        values = heatmapData.values;
      } else {
        const isTargetLabel = (label: string) => {
          if (!disease) return false;
          const l = label.toLowerCase();
          const dn = disease.disease_name.toLowerCase();
          if (l === dn) return true;
          const siblings = allDiseases.filter((d: { disease_name: string; }) => d.disease_name === disease.disease_name);
          return siblings.some((sib) => {
            const sub = sib.disease_subtype?.toLowerCase();
            if (!sub || sub === 'unspecific') return false;
            return l === sub || l.includes(sub) || sub.includes(l);
          });
        };

        const targetIndices: number[] = [];
        heatmapData.labels.forEach((label: string, idx: number) => {
          if (isTargetLabel(label)) {
            targetIndices.push(idx);
            labels.push(label);
          }
        });

        values = targetIndices.map(rowIdx => {
          const row = heatmapData.values[rowIdx] || [];
          return targetIndices.map(colIdx => row[colIdx] || 0);
        });
      }

      return [
        {
          z: values,
          type: 'heatmap',
          x: labels.map((label) => capitalize(label)),
          y: labels.map((label) => capitalize(label)),
        },
      ];
    }
  });

  updatePlot = effect(() => {
    const plotData = this.plotData$();
    if (!plotData) return;
    const div = this.plotDiv$().nativeElement;
    const isHeatmap = this.mode$() === 'heatmap';

    // On the heatmap, force a tick label for every category on both axes (Plotly otherwise
    // auto-thins them). The scatter keeps its default continuous axes.
    const forcedTicks = {
      automargin: true,
      type: 'category',
      tickmode: 'linear',
      tick0: 0,
      dtick: 1,
    };

    Plotly.newPlot(div, plotData, {
      height: 700,
      yaxis: isHeatmap ? forcedTicks : { automargin: true },
      xaxis: isHeatmap ? forcedTicks : { automargin: true },
      title: isHeatmap ? 'Similarity Heatmap' : 'Network Similarity (MDS)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
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
    //Plotly.purge(this.heatmapDiv$().nativeElement);

    this.refreshEffect.destroy();
    this.updatePlot.destroy();
  }
}
