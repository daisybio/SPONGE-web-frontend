import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { EnrichmentScoreDistributions, PlotData } from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { buildColorMap, getDiseaseDisplayName } from '../../../../../cancer-colors';
import { ExploreService } from '../../service/explore.service';
import {
  DensityPlotComponent, DensityRow, DensityPlotConfig,
} from '../../../../../components/density-plot/density-plot.component';

/** KDE over the uploaded custom scores, sampled on a fixed grid (used for the optional overlay). */
function calculateKDE(values: number[]): { x: number[], y: number[] } {
  if (values.length === 0) return { x: [], y: [] };

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance) || 0.1;
  const bandwidth = 1.06 * stdDev * Math.pow(values.length, -0.2) || 0.1;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const x: number[] = [];
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    x.push(min - 0.2 * range + (1.4 * range * i / steps));
  }

  const y = x.map(point =>
    values.reduce((sum, v) => {
      const u = (point - v) / bandwidth;
      return sum + Math.exp(-0.5 * u * u) / (bandwidth * Math.sqrt(2 * Math.PI));
    }, 0) / values.length
  );

  return { x, y };
}

/**
 * Explore "SpongEffects Score Distribution": the reference (TCGA) enrichment-score density per
 * class, plus an optional overlay of uploaded custom scores. Data prep only — rendering, the
 * Combined/Stacked toggle, download and hover live in the shared {@link DensityPlotComponent}.
 */
@Component({
  selector: 'app-enrichment-class-plot',
  imports: [DensityPlotComponent],
  templateUrl: './enrichment-class-plot.component.html',
  styleUrl: './enrichment-class-plot.component.scss',
})
export class EnrichmentClassPlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService, { optional: true });
  backend = inject(BackendService);

  refreshSignal$ = input();
  isCombinedMode = signal<boolean>(true);

  // Inputs (fall back to ExploreService state when not provided).
  diseaseInput = input<string | undefined>(undefined, { alias: 'disease' });
  levelInput = input<'gene' | 'transcript' | undefined>(undefined, { alias: 'level' });
  paramSetsInput = input<{ [key: string]: any } | undefined>(undefined, { alias: 'selectedParamSets' });
  customScores = input<number[] | undefined>(undefined);
  customLabel = input<string>('Uploaded Samples');

  selectedDisease = computed(() => this.diseaseInput() ?? this.exploreService?.selectedDisease$() ?? 'pancancer');
  level$ = computed(() => this.levelInput() ?? this.exploreService?.level$() ?? 'gene');
  selectedParamSets$ = computed(() => this.paramSetsInput() ?? this.exploreService?.selectedParamSets$() ?? {});

  plotResource = resource({
    request: computed(() => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.selectedDisease(),
      level: this.level$(),
      selectedParamSets: this.selectedParamSets$(),
      customScores: this.customScores(),
      customLabel: this.customLabel(),
      // legend visibility depends on the mode, so rebuild the rows when it toggles
      isCombinedMode: this.isCombinedMode(),
    })),
    loader: async (param) => {
      const { version, cancer, level, selectedParamSets, customScores, customLabel } = param.request;
      if (version === undefined || cancer === undefined || level === undefined || selectedParamSets === undefined) {
        return null;
      }
      const densities = await this.getEnrichmentClassData(version, cancer, level, selectedParamSets, customScores, customLabel);
      return this.buildRows(densities);
    },
  });

  rows = computed<DensityRow[]>(() => this.plotResource.value()?.rows ?? []);
  config = computed<DensityPlotConfig>(() => this.plotResource.value()?.config ?? { title: '' });

  private async getEnrichmentClassData(
    version: number,
    cancer: string,
    level: string,
    selectedParamSets: { [key: string]: any },
    customScores?: number[],
    customLabel?: string,
  ): Promise<Map<string, PlotData>> {
    const datas: EnrichmentScoreDistributions[] = [];
    for (const _ of Object.entries(selectedParamSets)) {
      const data = await this.backend.getEnrichmentScoreDistributions(version, cancer, level, selectedParamSets);
      data.forEach((entry: EnrichmentScoreDistributions) => datas.push(entry));
    }
    const classDensities = new Map<string, PlotData>();
    datas.forEach(entry => {
      const bucket = classDensities.get(entry.prediction_class);
      if (bucket) {
        bucket.x.push(entry.enrichment_score);
        bucket.y.push(entry.density);
      } else {
        classDensities.set(entry.prediction_class, { x: [entry.enrichment_score], y: [entry.density] });
      }
    });

    if (customScores && customScores.length > 0 && customLabel) {
      const { x, y } = calculateKDE(customScores);
      classDensities.set(customLabel, { x, y });
    }
    return classDensities;
  }

  private buildRows(classDensities: Map<string, PlotData>): { rows: DensityRow[]; config: DensityPlotConfig } {
    const combined = this.isCombinedMode();
    const typeOrSubtype = this.selectedDisease() === 'pancancer' ? 'Type' : 'Subtype';
    const parentType = this.selectedDisease() !== 'pancancer' ? this.selectedDisease() : undefined;
    const customLbl = this.customLabel();

    const classes = [...classDensities.keys()].filter(k => k !== customLbl).sort();
    if (classDensities.has(customLbl)) classes.push(customLbl);

    const colorMap = buildColorMap(classes.filter(k => k !== customLbl), parentType);
    if (classDensities.has(customLbl)) colorMap[customLbl] = '#8e44ad';

    const rows: DensityRow[] = classes.map(cls => {
      const pd = classDensities.get(cls)!;
      const color = colorMap[cls] ?? '#888888';
      const prettyName = getDiseaseDisplayName(cls);
      return {
        key: cls,
        label: prettyName,
        color,
        curves: [{
          x: pd.x, y: pd.y, color, fillOpacity: 0.4,
          showInLegend: combined, hoverName: prettyName, legendGroup: cls,
        }],
      };
    });

    const config: DensityPlotConfig = {
      title: `SpongEffects Enrichment Score Density per Cancer ${typeOrSubtype}`,
      showYTicks: false,
      combinedHeight: 500,
      stackedRowHeight: 180,
      downloadFilename: 'enrichment_class_plot',
    };
    return { rows, config };
  }
}
