import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { BackendService } from '../../../../services/backend.service';
import { VersionsService } from '../../../../services/versions.service';
import { PredictService } from '../service/predict.service';
import { EnrichmentScoreDistributions, PlotData } from '../../../../interfaces';
import { buildColorMap, PATIENT_HIGHLIGHT_COLOR, PATIENT_HIGHLIGHT_RGBA, getDiseaseDisplayName } from '../../../../cancer-colors';
import {
  DensityPlotComponent, DensityRow, DensityCurve, DensityRug, DensityPlotConfig,
} from '../../../../components/density-plot/density-plot.component';

/** Simple Gaussian KDE evaluated over a fixed x-grid. */
function gaussianKDE(values: number[], xGrid: number[], bandwidth?: number): number[] {
  if (!values.length) return xGrid.map(() => 0);
  const bw = bandwidth ?? (1.06 * std(values) * Math.pow(values.length, -0.2));
  const safe = bw || 0.01;
  return xGrid.map(xi =>
    values.reduce((s, v) => s + gaussianPdf((xi - v) / safe), 0) / (values.length * safe)
  );
}
function gaussianPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
function std(arr: number[]): number {
  if (arr.length < 2) return 1;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}
function linspace(a: number, b: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + (i / (n - 1)) * (b - a));
}

function normalizeSubtypeClass(cls: string, availableClasses: string[]): string {
  if (!cls || !availableClasses.length) return cls || 'Unknown';
  if (availableClasses.includes(cls)) return cls;

  const lower = cls.toLowerCase().trim();
  for (const ac of availableClasses) {
    if (ac.toLowerCase() === lower) return ac;
  }
  for (const ac of availableClasses) {
    if (ac.toLowerCase().endsWith('_' + lower) || lower.endsWith('_' + ac.toLowerCase())) {
      return ac;
    }
  }
  return cls;
}

function splitDensityCurves(xs: number[], ys: number[]): { x: number[]; y: number[] }[] {
  const curves: { x: number[]; y: number[] }[] = [];
  let cx: number[] = [], cy: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (isNaN(xs[i]) || isNaN(ys[i])) {
      if (cx.length) { curves.push({ x: cx, y: cy }); cx = []; cy = []; }
    } else {
      cx.push(xs[i]); cy.push(ys[i]);
    }
  }
  if (cx.length) curves.push({ x: cx, y: cy });
  return curves;
}

interface ScoreBlock {
  genes: string[];
  values: number[][];
  samples: string[];
}

interface PredictSample {
  sampleID: string;
  typePrediction: string;
  subtypePrediction?: string;
}

interface PatientEntry {
  sampleID: string;
  moduleScores: number[];
  genes: string[];
}

/**
 * Compute "SpongEffects Score Distribution": TCGA reference density per cancer class overlaid with
 * the uploaded samples' per-module enrichment scores (pooled in combined mode, one curve per
 * sample in stacked mode) plus rug ticks. Data prep only — rendering, the Combined/Stacked toggle,
 * download and hover live in the shared {@link DensityPlotComponent}.
 */
@Component({
  selector: 'app-classification-plot',
  imports: [DensityPlotComponent],
  templateUrl: './classification-plot.component.html',
  styleUrl: './classification-plot.component.scss',
})
export class ClassificationPlotComponent {
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
  predictService = inject(PredictService);
  protected readonly highlightColor = PATIENT_HIGHLIGHT_COLOR;

  refreshSignal$ = input();
  isCombinedMode = signal(true);

  plotResource = resource({
    params: computed(() => ({
      prediction: this.predictService.prediction$(),
      version: this.versionsService.versionReadOnly()(),
      level: this.predictService.level(),
      isSubtype: this.predictService._subtypes$(),
      isCombinedMode: this.isCombinedMode(),
      selectedScope: this.predictService.selectedScope$(),
    })),
    loader: async (param) => {
      const { prediction, version, level, isSubtype, isCombinedMode } = param.params;
      if (!prediction || !version) return null;
      return await this.buildRows(prediction, version, level, isSubtype, isCombinedMode);
    },
  });

  rows = computed<DensityRow[]>(() => this.plotResource.value()?.rows ?? []);
  config = computed<DensityPlotConfig>(() => this.plotResource.value()?.config ?? { title: '' });

  private async buildRows(
    prediction: any, version: number, level: string, isSubtype: boolean, isCombinedMode: boolean,
  ): Promise<{ rows: DensityRow[]; config: DensityPlotConfig } | null> {
    // 1. Meta logic
    const selectedScope = this.predictService.selectedScope$();
    const predictedType: string = prediction.meta?.[0]?.type_predict ?? 'pancancer';
    const disease = isSubtype ? (selectedScope !== 'pancancer' ? selectedScope : predictedType) : 'pancancer';
    const labelKind = isSubtype ? 'Subtype' : 'Type';
    const predictedClass = isSubtype ? (prediction.meta?.[0]?.subtype_predict) : predictedType;

    // 2. TCGA background density curves
    const classDensities: Map<string, PlotData> = new Map();
    try {
      const densities: EnrichmentScoreDistributions[] =
        await this.backend.getEnrichmentScoreDistributions(version, disease, level, {});
      for (const entry of densities) {
        if (!classDensities.has(entry.prediction_class)) {
          classDensities.set(entry.prediction_class, { x: [], y: [] });
        }
        const bucket = classDensities.get(entry.prediction_class)!;
        bucket.x.push(entry.enrichment_score);
        bucket.y.push(entry.density);
      }
    } catch (e) {
      console.error('Failed to load distributions:', e);
    }

    // 3. Patient scores (labels normalized to TCGA density keys)
    const predData: PredictSample[] = prediction.data ?? [];
    const availableClasses = [...classDensities.keys()];
    const patientModuleScores = isSubtype
      ? this.buildPatientModuleScoresByType(predData, prediction.type_scores ?? {}, availableClasses)
      : this.buildPatientModuleScoresByClass(predData, prediction.scores, availableClasses);

    // 4. Ordering: predicted class last
    let allClasses = [...new Set([...classDensities.keys(), ...patientModuleScores.keys()])].sort();
    const normalizedPredicted = predictedClass ? normalizeSubtypeClass(predictedClass, availableClasses) : predictedClass;
    if (normalizedPredicted && allClasses.includes(normalizedPredicted)) {
      allClasses = [...allClasses.filter(c => c !== normalizedPredicted), normalizedPredicted];
    }
    if (allClasses.length === 0) return null;

    // 5. Universal x-range
    const allXFlat = [
      ...[...classDensities.values()].flatMap(d => d.x),
      ...[...patientModuleScores.values()].flatMap(pts => pts.flatMap(p => p.moduleScores)),
    ];
    const globalMin = allXFlat.length ? Math.floor(Math.min(...allXFlat)) : -5;
    const globalMax = allXFlat.length ? Math.ceil(Math.max(...allXFlat)) : 5;

    const colorMap = buildColorMap(allClasses, isSubtype ? disease : undefined);

    const rows: DensityRow[] = [];

    allClasses.forEach((cls, index) => {
      const clsColor = colorMap[cls] ?? '#888888';
      const prettyName = getDiseaseDisplayName(cls);
      const curves: DensityCurve[] = [];
      const rug: DensityRug[] = [];

      // TCGA background curve(s)
      const bg = classDensities.get(cls);
      if (bg) {
        splitDensityCurves(bg.x, bg.y).forEach((seg, ci) => {
          curves.push({
            x: seg.x, y: seg.y,
            color: clsColor,
            fillOpacity: isCombinedMode ? 0.2 : 0.35,
            legendName: isCombinedMode ? prettyName : `Background: ${prettyName}`,
            legendGroup: cls,
            showInLegend: isCombinedMode ? ci === 0 : false,
            hoverName: prettyName,
          });
        });
      }

      // Stacked mode: one patient curve + rug per sample
      if (!isCombinedMode) {
        const patientData = patientModuleScores.get(cls);
        patientData?.forEach((p, pIdx) => {
          if (!p.moduleScores.length) return;
          const grid = linspace(globalMin - 0.5, globalMax + 0.5, 256);
          const legendName = `Your Sample: ${p.sampleID}`;
          curves.push({
            x: grid, y: gaussianKDE(p.moduleScores, grid),
            color: PATIENT_HIGHLIGHT_COLOR, lineWidth: 2.5,
            fillColor: PATIENT_HIGHLIGHT_RGBA(0.15),
            legendName, legendGroup: `patient_${p.sampleID}`,
            showInLegend: index === 0 && pIdx === 0,
            hoverTemplate: `<b>${legendName}</b><br>Score: %{x:.3f}<extra></extra>`,
          });
          rug.push({
            x: p.moduleScores,
            color: PATIENT_HIGHLIGHT_COLOR,
            labels: p.moduleScores.map((_, modIdx) => p.genes?.[modIdx] ?? `module ${modIdx}`),
            legendGroup: `patient_${p.sampleID}`,
            hoverTemplate: `<b>Module: %{customdata}</b><br>Sample: ${p.sampleID}<br>Score: %{x:.4f}<extra></extra>`,
          });
        });
      }

      rows.push({ key: cls, label: prettyName, color: clsColor, curves, rug });
    });

    // Combined mode: a single pooled patient curve across ALL uploaded samples, drawn on top.
    if (isCombinedMode) {
      const allEntries = [...patientModuleScores.values()].flat();
      const pooledScores = allEntries.flatMap(p => p.moduleScores);
      const pooledGenes = allEntries.flatMap(p => p.genes ?? []);
      if (pooledScores.length) {
        const grid = linspace(globalMin - 0.5, globalMax + 0.5, 256);
        const legendName = `Your uploaded samples (${allEntries.length})`;
        rows.push({
          key: 'patient_pooled',
          label: legendName,
          color: PATIENT_HIGHLIGHT_COLOR,
          curves: [{
            x: grid, y: gaussianKDE(pooledScores, grid),
            color: PATIENT_HIGHLIGHT_COLOR, lineWidth: 2.5,
            fillColor: PATIENT_HIGHLIGHT_RGBA(0.15),
            legendName, legendGroup: 'patient_pooled', showInLegend: true,
            hoverTemplate: `<b>${legendName}</b><br>Score: %{x:.3f}<extra></extra>`,
          }],
          rug: [{
            x: pooledScores,
            color: PATIENT_HIGHLIGHT_COLOR,
            labels: pooledScores.map((_, i) => pooledGenes?.[i] ?? `module ${i}`),
            legendGroup: 'patient_pooled',
            hoverTemplate: `<b>Module: %{customdata}</b><br>Score: %{x:.4f}<extra></extra>`,
          }],
        });
      }
    }

    const config: DensityPlotConfig = {
      title: `SpongEffects Enrichment Score Density per Cancer ${labelKind}` +
        `<br><sub style="color:${PATIENT_HIGHLIGHT_COLOR}; font-size: 12px">Red = your uploaded samples</sub>`,
      showYTicks: false,
      combinedHeight: 500,
      stackedRowHeight: 150,
      xRange: [globalMin, globalMax],
      downloadFilename: 'classification_plot',
    };
    return { rows, config };
  }

  private buildPatientModuleScoresByClass(
    predData: PredictSample[],
    scores: ScoreBlock,
    availableClasses?: string[],
  ): Map<string, PatientEntry[]> {
    const result = new Map<string, PatientEntry[]>();
    if (!scores?.samples?.length || !scores?.values?.length) return result;

    scores.samples.forEach((sampleID, colIdx) => {
      const pd = predData.find(d => d.sampleID === sampleID || d.sampleID?.toLowerCase() === sampleID?.toLowerCase());
      const rawCls = pd?.typePrediction;
      if (!rawCls) return;
      const cls = availableClasses?.length ? normalizeSubtypeClass(rawCls, availableClasses) : rawCls;
      const moduleScores = scores.values.map(row => row[colIdx] ?? 0);
      if (!result.has(cls)) result.set(cls, []);
      result.get(cls)!.push({ sampleID, moduleScores, genes: scores.genes });
    });
    return result;
  }

  private buildPatientModuleScoresByType(
    predData: PredictSample[],
    typeScores: Record<string, ScoreBlock>,
    availableClasses?: string[],
  ): Map<string, PatientEntry[]> {
    const result = new Map<string, PatientEntry[]>();
    for (const [_, block] of Object.entries(typeScores)) {
      if (!block.samples?.length || !block.values?.length) continue;
      block.samples.forEach((sampleID, colIdx) => {
        const pd = predData.find(d => d.sampleID === sampleID || d.sampleID?.toLowerCase() === sampleID?.toLowerCase());
        const rawCls = pd?.subtypePrediction || 'Unknown';
        const cls = availableClasses?.length ? normalizeSubtypeClass(rawCls, availableClasses) : rawCls;
        const moduleScores = block.values.map(row => row[colIdx] ?? 0);
        if (!result.has(cls)) result.set(cls, []);
        result.get(cls)!.push({ sampleID, moduleScores, genes: block.genes });
      });
    }
    return result;
  }
}
