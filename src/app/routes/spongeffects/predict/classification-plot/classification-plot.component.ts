import {
  Component, computed, effect, ElementRef, inject, input, resource, viewChild,
  AfterViewInit, OnDestroy, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../../../services/backend.service';
import { VersionsService } from '../../../../services/versions.service';
import { PredictService } from '../service/predict.service';
import { InfoComponent } from '../../../../components/info/info.component';
import { EnrichmentScoreDistributions, PlotData } from '../../../../interfaces';
import { capitalize } from 'lodash';
import { buildColorMap, hexToRgba, PATIENT_HIGHLIGHT_COLOR, PATIENT_HIGHLIGHT_RGBA, getDiseaseDisplayName } from '../../../../cancer-colors';


declare var Plotly: any;

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

@Component({
  selector: 'app-classification-plot',
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    InfoComponent
  ],
  templateUrl: './classification-plot.component.html',
  styleUrl: './classification-plot.component.scss',
})
export class ClassificationPlotComponent implements AfterViewInit, OnDestroy {
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
  predictService = inject(PredictService);
  protected readonly capitalize = capitalize;

  refreshSignal$ = input();
  isCombinedMode = signal(true);
  protected readonly highlightColor = PATIENT_HIGHLIGHT_COLOR;

  plotDiv = viewChild.required<ElementRef<HTMLDivElement>>('classificationPlot');
  isLoading = signal<boolean>(false);
  hasData = false;

  private resizeObserver: ResizeObserver | null = null;

  plotResource = resource({
    request: computed(() => ({
      prediction: this.predictService.prediction$(),
      version: this.versionsService.versionReadOnly()(),
      level: this.predictService.level(),
      isSubtype: this.predictService._subtypes$(),
      isCombinedMode: this.isCombinedMode(),
    })),
    loader: async (param) => {
      const { prediction, version, level, isSubtype, isCombinedMode } = param.request;
      if (!prediction || !version) { this.hasData = false; return null; }
      this.isLoading.set(true);
      try {
        await this.buildPlot(prediction, version, level, isSubtype, isCombinedMode);
      } finally {
        this.isLoading.set(false);
      }
      return true;
    },
  });

  refreshEffect = effect(() => {
    this.refreshSignal$();
    this.resize();
  });

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    const el = this.plotDiv()?.nativeElement;
    if (el) this.resizeObserver.observe(el);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    const el = this.plotDiv()?.nativeElement;
    if (el) Plotly.purge(el);
  }

  private async buildPlot(prediction: any, version: number, level: string, isSubtype: boolean, isCombinedMode: boolean) {
    const el = this.plotDiv()?.nativeElement;
    if (!el) return;
    this.hasData = false;

    // 1. Meta logic
    const predictedType: string = prediction.meta?.[0]?.type_predict ?? 'pancancer';
    const disease = isSubtype ? predictedType : 'pancancer';
    const labelKind = isSubtype ? 'Subtype' : 'Type';
    const predictedClass = isSubtype ? (prediction.meta?.[0]?.subtype_predict) : predictedType;

    // fetch TCGA background density curves
    let classDensities: Map<string, PlotData> = new Map();
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

    // 3. Patient Scores
    const predData: PredictSample[] = prediction.data ?? [];
    const patientModuleScores = isSubtype
      ? this.buildPatientModuleScoresByType(predData, prediction.type_scores ?? {})
      : this.buildPatientModuleScoresByClass(predData, prediction.scores);

    // 4. ORDERING: predicted class at the tail (top row in Plotly ridgeline)
    let allClasses = [...new Set([...classDensities.keys(), ...patientModuleScores.keys()])].sort();
    if (predictedClass && allClasses.includes(predictedClass)) {
      allClasses = [...allClasses.filter(c => c !== predictedClass), predictedClass];
    }

    if (allClasses.length === 0) {
      console.warn('[ClassificationPlot] No classes to render.');
      Plotly.purge(el);
      return;
    }
    // 5. RANGE: universal limits
    const allXFlat = [
      ...[...classDensities.values()].flatMap(d => d.x),
      ...[...patientModuleScores.values()].flatMap(pts => pts.flatMap(p => p.moduleScores))
    ];
    const globalMin = allXFlat.length ? Math.floor(Math.min(...allXFlat)) : -5;
    const globalMax = allXFlat.length ? Math.ceil(Math.max(...allXFlat)) : 5;

    // Build color map for all classes
    const colorMap = buildColorMap(
      allClasses,
      isSubtype ? disease : undefined  // pass parent type when rendering subtypes
    );

    const traces: any[] = [];
    const annotations: any[] = [];
    const axisEntries: { xKey: string; yKey: string; xRef: string; yRef: string }[] = [];

    const plotHeight = isCombinedMode ? 500 : Math.max(400, allClasses.length * 150);

    allClasses.forEach((cls, index) => {
      const clsColor = colorMap[cls] ?? '#888888';
      const xRef = isCombinedMode ? 'x' : (index === 0 ? 'x' : `x${index + 1}`);
      const yRef = isCombinedMode ? 'y' : (index === 0 ? 'y' : `y${index + 1}`);
      const xKey = isCombinedMode ? 'xaxis' : (index === 0 ? 'xaxis' : `xaxis${index + 1}`);
      const yKey = isCombinedMode ? 'yaxis' : (index === 0 ? 'yaxis' : `yaxis${index + 1}`);
      if (!isCombinedMode) axisEntries.push({ xKey, yKey, xRef, yRef });

      const prettyName = getDiseaseDisplayName(cls);

      let maxDensity: number = Math.max(...classDensities.get(cls)?.y ?? []);

      // TCGA Curve(s)
      const bg = classDensities.get(cls);
      if (bg) {
        const bgTraces = this.splitDensityCurves(bg.x, bg.y);
        bgTraces.forEach((curve, ci) => {
          traces.push({
            x: curve.x, y: curve.y, xaxis: xRef, yaxis: yRef,
            type: 'scatter', mode: 'lines', fill: 'tozeroy',
            fillcolor: hexToRgba(clsColor, isCombinedMode ? 0.2 : 0.35),
            opacity: 1,
            name: isCombinedMode ? prettyName : `Background: ${prettyName}`,
            legendgroup: cls,
            showlegend: isCombinedMode ? ci === 0 : false,
            line: { width: 1.5, color: clsColor },
            hovertemplate: `<b>${prettyName}</b><br>Score: %{x:.3f}<br>Density: %{y:.4f}<extra></extra>`,
          });
        });
      }

      // Patient KDE
      const patientData = patientModuleScores.get(cls) as PatientEntry[] | undefined;
      if (patientData) {
        if (isCombinedMode) {
          // Combined mode: pool all samples' scores into one KDE per predicted type
          const pooledScores = patientData.flatMap(p => p.moduleScores);
          const pooledGenes = patientData.flatMap(p => p.genes);
          if (pooledScores.length) {
            const grid = linspace(globalMin - 0.5, globalMax + 0.5, 256);
            const kdeValues = gaussianKDE(pooledScores, grid);
            maxDensity = Math.max(maxDensity, Math.max(...kdeValues));
            const nSamples = patientData.length;
            const legendName = `Your ${prettyName} samples (${nSamples})`;

            traces.push({
              x: grid, y: kdeValues,
              xaxis: xRef, yaxis: yRef,
              type: 'scatter', mode: 'lines', fill: 'tozeroy',
              fillcolor: PATIENT_HIGHLIGHT_RGBA(0.15),
              line: { color: PATIENT_HIGHLIGHT_COLOR, width: 2.5 },
              name: legendName, legendgroup: 'patient_pooled',
              showlegend: index === 0,
              hovertemplate: `<b>${legendName}</b><br>Score: %{x:.3f}<extra></extra>`,
            });

            // Rug markers for pooled scores
            const rugCustom = pooledScores.map((_, i) => pooledGenes?.[i] ?? `module ${i}`);
            traces.push({
              x: pooledScores, y: pooledScores.map(() => 0), xaxis: xRef, yaxis: yRef,
              type: 'scatter', mode: 'markers',
              marker: {
                color: PATIENT_HIGHLIGHT_COLOR,
                symbol: 'line-ns',
                size: 10,
                line: { color: PATIENT_HIGHLIGHT_COLOR, width: 1.5 }
              },
              name: 'Module markers', legendgroup: 'patient_pooled', showlegend: false,
              customdata: rugCustom,
              hovertemplate: `<b>Module: %{customdata}</b><br>Score: %{x:.4f}<extra></extra>`,
            });
          }
        } else {
          // Stacked mode: one curve per sample (unchanged)
          patientData.forEach((p, pIdx) => {
            const patientScores = p.moduleScores;
            if (patientScores.length) {
              const grid = linspace(globalMin - 0.5, globalMax + 0.5, 256);
              const legendName = `Your Sample: ${p.sampleID}`;
              const kdeValues = gaussianKDE(patientScores, grid);
              maxDensity = Math.max(maxDensity, Math.max(...kdeValues));

              traces.push({
                x: grid, y: kdeValues,
                xaxis: xRef, yaxis: yRef,
                type: 'scatter', mode: 'lines', fill: 'tozeroy',
                fillcolor: PATIENT_HIGHLIGHT_RGBA(0.15),
                line: { color: PATIENT_HIGHLIGHT_COLOR, width: 2.5 },
                name: legendName, legendgroup: `patient_${p.sampleID}`,
                showlegend: index === 0 && pIdx === 0,
                hovertemplate: `<b>${legendName}</b><br>Score: %{x:.3f}<extra></extra>`,
              });

              // Rug for this specific patient
              const rugX: number[] = [];
              const rugCustom: string[] = [];
              patientScores.forEach((score, modIdx) => {
                rugX.push(score);
                rugCustom.push(p.genes?.[modIdx] ?? `module ${modIdx}`);
              });
              traces.push({
                x: rugX, y: rugX.map(() => 0), xaxis: xRef, yaxis: yRef,
                type: 'scatter', mode: 'markers',
                marker: {
                  color: PATIENT_HIGHLIGHT_COLOR,
                  symbol: 'line-ns',
                  size: 10,
                  line: { color: PATIENT_HIGHLIGHT_COLOR, width: 1.5 }
                },
                name: `Module markers: ${p.sampleID}`, legendgroup: `patient_${p.sampleID}`, showlegend: false,
                customdata: rugCustom,
                hovertemplate: `<b>Module: %{customdata}</b><br>Sample: ${p.sampleID}<br>Score: %{x:.4f}<extra></extra>`,
              });
            }
          });
        }
      }

      // disease name annotation
      if (!isCombinedMode) {
        annotations.push({
          xref: xRef, yref: yRef,
          x: globalMin + 1.5,
          // y: this.subplotLabelY(index, allClasses.length, 70 / plotHeight / allClasses.length),
          y: maxDensity / 2,
          text: `${prettyName}`,
          align: 'left', showarrow: false,
          xanchor: 'left', yanchor: 'middle'
        });
      }
    });

    if (isCombinedMode) axisEntries.push({ xKey: 'xaxis', yKey: 'yaxis', xRef: 'x', yRef: 'y' });

    const layout: any = {
      showlegend: true, autosize: true, height: plotHeight,
      title: {
        text: `SpongEffects Enrichment Score Density per Cancer ${labelKind}` +
          `<br><sub style="color:${PATIENT_HIGHLIGHT_COLOR}; font-size: 12px">Red = your uploaded samples</sub>`,
        font: { size: 14 },
      },
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      legend: { orientation: 'h', x: 0.5, y: -0.5, xanchor: 'center' },
      margin: {
        t: 80, b: 70,
        l: 60, // wide left margin for labels in stacked mode
        r: 40
      }, annotations,
    };

    if (!isCombinedMode) {
      layout.grid = { rows: allClasses.length, columns: 1, pattern: 'independent', roworder: 'bottom to top' };
    }

    axisEntries.forEach((ax, idx) => {
      layout[ax.xKey] = {
        range: [globalMin, globalMax],
        showgrid: true,
        zeroline: true,
        showticklabels: isCombinedMode || idx === 0,
        ...((isCombinedMode || idx === 0) ? {
          title: { text: 'SpongEffects Enrichment Score', font: { size: 11 } },
          automargin: true
        } : {}),
      };
      layout[ax.yKey] = {
        showgrid: true,
        zeroline: true,
        automargin: true,
        showticklabels: false
      };
    });

    Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false });
    this.hasData = true;
  }

  private buildPatientModuleScoresByClass(
    predData: PredictSample[],
    scores: ScoreBlock,
  ): Map<string, PatientEntry[]> {
    const result = new Map<string, PatientEntry[]>();
    if (!scores?.samples?.length || !scores?.values?.length) return result;

    scores.samples.forEach((sampleID, colIdx) => {
      const pd = predData.find(d => d.sampleID === sampleID);
      const cls = pd?.typePrediction;
      if (!cls) return;

      const moduleScores = scores.values.map(row => row[colIdx] ?? 0);
      if (!result.has(cls)) result.set(cls, []);
      result.get(cls)!.push({ sampleID, moduleScores, genes: scores.genes });
    });
    return result;
  }

  private buildPatientModuleScoresByType(
    predData: PredictSample[],
    typeScores: Record<string, ScoreBlock>,
  ): Map<string, PatientEntry[]> {
    const result = new Map<string, PatientEntry[]>();
    for (const [_, block] of Object.entries(typeScores)) {
      if (!block.samples?.length || !block.values?.length) continue;
      block.samples.forEach((sampleID, colIdx) => {
        const pd = predData.find(d => d.sampleID === sampleID);
        const cls = pd?.subtypePrediction || 'Unknown';
        const moduleScores = block.values.map(row => row[colIdx] ?? 0);
        if (!result.has(cls)) result.set(cls, []);
        result.get(cls)!.push({ sampleID, moduleScores, genes: block.genes });
      });
    }
    return result;
  }

  private splitDensityCurves(xs: number[], ys: number[]): { x: number[]; y: number[]; module?: string }[] {
    const curves: { x: number[]; y: number[]; module?: string }[] = [];
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

  private subplotLabelY(index: number, total: number, margin: number): number {
    const rowHeight = 1 / total;
    return (rowHeight + ((index - 1) * (rowHeight + margin)) + (rowHeight / 2));
  }

  private resize() {
    const el = this.plotDiv()?.nativeElement;
    if (el?.checkVisibility?.()) Plotly.Plots.resize(el);
  }

  downloadPlot(format: 'png' | 'jpeg' | 'svg'): void {
    const el = this.plotDiv()?.nativeElement;
    if (el) {
      Plotly.downloadImage(el, {
        format: format,
        filename: 'classification_plot_' + Date.now(),
        width: 800,
        height: 600
      });
    }
  }
}
