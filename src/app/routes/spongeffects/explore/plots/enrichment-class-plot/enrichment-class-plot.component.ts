import {Component, computed, effect, ElementRef, inject, input, resource, viewChild} from '@angular/core';
import {Metric, PlotData, PlotlyData, RunPerformance} from '../../../../../interfaces';
import {BackendService} from '../../../../../services/backend.service';
import {VersionsService} from '../../../../../services/versions.service';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {ExploreService} from "../../service/explore.service";
import {InfoComponent} from "../../../../../components/info/info.component";

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
export class EnrichmentClassPlotComponent {
  versionService = inject(VersionsService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  refreshSignal$ = input();

  enrichmentClassPlot = viewChild.required<ElementRef<HTMLDivElement>>('enrichmentClassPlot');

  // plot parameters

  plotEnrichmentClassResouce = resource({
    request: computed(() => {
      return {
        version: this.versionService.versionReadOnly()(),
        cancer: this.exploreService.selectedDisease$(),
        level: this.exploreService.level$()
      }
    }),
    loader: async (param) => {
      const version = param.request.version;
      const cancer = param.request.cancer;
      const level = param.request.level;
      if (version === undefined || cancer === undefined || level === undefined) return;
      const data = this.getEnrichmentClassData(version, cancer, level);
      console.log(data);
      return await this.plotEnrichmentClassPlot(data);
    }
  });

  constructor() {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlot();
    });
  }

  async getEnrichmentClassData(version: number, cancer: string, level: string): Promise<any> {
    const data = await this.backend.getEnrichmentScoreDistributions(version, cancer, level);
    const classDensities: Map<string, PlotData> = new Map<string, PlotData>();
    data.forEach(entry => {
      if (classDensities.has(entry.prediction_class)) {
        classDensities.get(entry.prediction_class)?.x.push(entry.enrichment_score)
        classDensities.get(entry.prediction_class)?.y.push(entry.density)
      } else {
        classDensities.set(entry.prediction_class, {
          x: [entry.enrichment_score], y: [entry.density]
        });
      }
    });
    return classDensities;
  }


  async plotEnrichmentClassPlot(enrichmentData:  Promise<Map<string, PlotData>>): Promise<PlotlyData> {

    // fill subtype specific data
    let data: any[] = [];
    const enrichmentDataResponse = await enrichmentData;
    enrichmentDataResponse.forEach((plotData, subtype) => {
      // push trace for each subtype
      data.push({
        x: plotData.x,
        y: plotData.y,
        fill: "tozeroy",
        type: "scatter",
        mode: "lines",
        opacity: 0.8,
        name: subtype
      });
    });
    // add subplot for each trace
    data.slice(1).forEach((d, i) => {
      let idx: string = (i+2).toString();
      d.xaxis = 'x' + idx
      d.yaxis = 'y' + idx
    });
    // determine range of display
    let minScore: number = Math.round(Math.min(...data.map(d => Math.min(...d.x))));
    let maxScore: number = Math.round(Math.max(...data.map(d => Math.max(...d.x))));
    const plot_height: number =  data.length * 200;
    // set general layout options
    let layout: any = {
      showlegend: false,
      autosize: true,
      legend: {"orientation": "h"},
      grid: {
        rows: data.length,
        columns: 1,
        pattern: 'independent',
        roworder: 'bottom to top'
      },
      height: plot_height,
      title: "spongEffects enrichment score density for predictive classes",
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    };
    // set constant y axis layout
    const y_axis_layout = {
      showgrid: false,
      automargin: true,
      showticklabels: false,
    };
    const annotations: any[] = [];
    // add layout to each trace
    data.forEach((d, index) => {
      let x_axis_layout_i: any = {
        range: [minScore, maxScore],
        showgrid: false,
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
        x_axis_layout_i["title"] = "spongEffects enrichment score";
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
    console.log(plot);
    return plot;
  }

  refreshPlot() {
    const plotDiv = this.enrichmentClassPlot().nativeElement;
    if(plotDiv.checkVisibility()) {
      Plotly.Plots.resize(plotDiv);
    }
  }


}
