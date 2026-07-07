import { Component, computed, effect, ElementRef, inject, input, resource, viewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { EnrichmentScoreDistributions, Metric, PlotData, PlotlyData, RunPerformance } from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { buildColorMap, hexToRgba, getDiseaseDisplayName } from '../../../../../cancer-colors';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ExploreService } from "../../service/explore.service";
import { PredictService } from "../../../predict/service/predict.service";
import { InfoComponent } from "../../../../../components/info/info.component";

declare var Plotly: any;

@Component({
  selector: 'app-enrichment-class-plot',
  imports: [
    MatExpansionModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    InfoComponent
  ],
  templateUrl: './enrichment-class-plot.component.html',
  styleUrl: './enrichment-class-plot.component.scss'
})
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
  
  const y = x.map(point => {
    return values.reduce((sum, v) => {
      const u = (point - v) / bandwidth;
      return sum + Math.exp(-0.5 * u * u) / (bandwidth * Math.sqrt(2 * Math.PI));
    }, 0) / values.length;
  });
  
  return { x, y };
}

export class EnrichmentClassPlotComponent implements OnInit, AfterViewInit, OnDestroy {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService, { optional: true });
  predictService = inject(PredictService, { optional: true });
  backend = inject(BackendService);
  refreshSignal$ = input();
  
  // Inputs
  diseaseInput = input<string | undefined>(undefined, { alias: 'disease' });
  levelInput = input<'gene' | 'transcript' | undefined>(undefined, { alias: 'level' });
  paramSetsInput = input<{ [key: string]: any } | undefined>(undefined, { alias: 'selectedParamSets' });
  customScores = input<number[] | undefined>(undefined);
  customLabel = input<string>('Uploaded Samples');

  selectedDisease = computed(() => this.diseaseInput() ?? this.exploreService?.selectedDisease$() ?? 'pancancer');
  level$ = computed(() => this.levelInput() ?? this.exploreService?.level$() ?? 'gene');
  selectedParamSets$ = computed(() => this.paramSetsInput() ?? this.exploreService?.selectedParamSets$() ?? {});

  enrichmentClassPlot = viewChild.required<ElementRef<HTMLDivElement>>('enrichmentClassPlot');

  private resizeObserver: ResizeObserver | null = null;

  plotEnrichmentClassResouce = resource({
    request: computed(() => {
      return {
        version: this.versionService.versionReadOnly()(),
        cancer: this.selectedDisease(),
        level: this.level$(),
        selectedParamSets: this.selectedParamSets$(),
        customScores: this.customScores(),
        customLabel: this.customLabel()
      }
    }),
    loader: async (param) => {
      const { version, cancer, level, selectedParamSets, customScores, customLabel } = param.request;
      if (version === undefined || cancer === undefined || level === undefined || selectedParamSets == undefined) return;
      const data = await this.getEnrichmentClassData(version, cancer, level, selectedParamSets, customScores, customLabel);
      return await this.plotEnrichmentClassPlot(data);
    }
  });

  refreshEffect = effect(() => {
    this.refreshSignal$();
    this.refreshPlot();
  });

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => {
      this.refreshPlot();
    });
    const el = this.enrichmentClassPlot()?.nativeElement;
    if (el) {
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  clearEffect = effect(() => {
    if (this.exploreService) {
      this.exploreService.selectedDisease$();
      this.exploreService.level$();
    }
    this.clearPlot();
  });

  async getEnrichmentClassData(
    version: number,
    cancer: string,
    level: string,
    selectedParamSets: { [key: string]: any },
    customScores?: number[],
    customLabel?: string
  ): Promise<any> {
    const datas: EnrichmentScoreDistributions[] = [];
    for (const [key, value] of Object.entries(selectedParamSets)) {
      const data = await this.backend.getEnrichmentScoreDistributions(version, cancer, level, selectedParamSets);
      data.map((entry: EnrichmentScoreDistributions) => {
        datas.push(entry);
      });
    }
    const classDensities: Map<string, PlotData> = new Map<string, PlotData>();
    datas.forEach(entry => {
      if (classDensities.has(entry.prediction_class)) {
        classDensities.get(entry.prediction_class)?.x.push(entry.enrichment_score)
        classDensities.get(entry.prediction_class)?.y.push(entry.density)
      } else {
        classDensities.set(entry.prediction_class, {
          x: [entry.enrichment_score], y: [entry.density]
        });
      }
    });

    if (customScores && customScores.length > 0 && customLabel) {
      const { x, y } = calculateKDE(customScores);
      classDensities.set(customLabel, { x, y });
    }

    return classDensities;
  }


  async plotEnrichmentClassPlot(enrichmentData: Promise<Map<string, PlotData>>): Promise<PlotlyData> {

    const type_or_subtype = this.selectedDisease() === 'pancancer' ? 'Type' : 'Subtype';
    const parentType = this.selectedDisease() !== 'pancancer' ? this.selectedDisease() : undefined;

    // fill subtype specific data
    let data: any[] = [];
    const enrichmentDataResponse = await enrichmentData;
    const customLbl = this.customLabel();
    let classes = [...enrichmentDataResponse.keys()].filter(k => k !== customLbl).sort();
    if (enrichmentDataResponse.has(customLbl)) {
      classes.push(customLbl);
    }
    const colorMap = buildColorMap(classes.filter(k => k !== customLbl), parentType);
    if (enrichmentDataResponse.has(customLbl)) {
      colorMap[customLbl] = '#8e44ad';
    }

    enrichmentDataResponse.forEach((plotData, subtype) => {
      const color = colorMap[subtype] ?? '#888888';
      const prettyName = getDiseaseDisplayName(subtype);
      // push trace for each subtype
      data.push({
        x: plotData.x,
        y: plotData.y,
        fill: "tozeroy",
        fillcolor: hexToRgba(color, 0.4),
        type: "scatter",
        mode: "lines",
        line: { color, width: 1.5 },
        opacity: 1,
        name: prettyName
      });
    });
    // add subplot for each trace
    data.slice(1).forEach((d, i) => {
      let idx: string = (i + 2).toString();
      d.xaxis = 'x' + idx
      d.yaxis = 'y' + idx
    });
    // determine range of display
    let minScore: number = Math.round(Math.min(...data.map(d => Math.min(...d.x))));
    let maxScore: number = Math.round(Math.max(...data.map(d => Math.max(...d.x))));
    const plot_height: number = data.length * 200;
    // set general layout options
    let layout: any = {
      showlegend: false,
      autosize: true,
      legend: { "orientation": "h" },
      grid: {
        rows: data.length,
        columns: 1,
        pattern: 'independent',
        roworder: 'bottom to top'
      },
      height: plot_height,
      title: `SpongEffects Enrichment Score Density for per Cancer ${type_or_subtype}`,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    };
    // set constant y axis layout
    const y_axis_layout = {
      showgrid: true,
      automargin: true,
      showticklabels: false,
    };
    const annotations: any[] = [];
    // add layout to each trace
    data.forEach((d, index) => {
      let x_axis_layout_i: any = {
        range: [minScore, maxScore],
        showgrid: true,
        showticklabels: false
      };
      let x_key: string = "xaxis";
      let y_key: string = "yaxis";
      let x: string = "x";
      let y: string = "y";
      if (index != 0) {
        x_key = x_key + (index + 1).toString();
        y_key = y_key + (index + 1).toString();
        x = x + (index + 1).toString();
        y = y + (index + 1).toString();
      } else {
        x_axis_layout_i["title"] = "SpongEffects Enrichment Score";
        x_axis_layout_i.showticklabels = true;
      }
      layout[x_key] = x_axis_layout_i;
      layout[y_key] = y_axis_layout;
      // add class annotation
      annotations.push({
        xref: x,
        yref: y,
        x: minScore + 1.5,
        y: 0.5,
        text: d.name,
        align: "left",
        showarrow: false,
        width: 250
      })
    });
    layout["annotations"] = annotations;
    const config = { responsive: true };
    let plot = Plotly.newPlot(this.enrichmentClassPlot().nativeElement, data, layout, config);
    return plot;
  }

  refreshPlot() {
    const plotDiv = this.enrichmentClassPlot().nativeElement;
    if (plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }

  clearPlot() {
    Plotly.purge(this.enrichmentClassPlot().nativeElement);
  }


}
