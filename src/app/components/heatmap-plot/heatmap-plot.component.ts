import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  EventEmitter,
  viewChild,
  signal,
  resource
} from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { capitalize } from 'lodash';
import { BackendService } from '../../services/backend.service';

declare const Plotly: any;

// DataSource interface
export type HeatmapDataSource = {
  getData: (params: any) => Promise<any[]>;
  transformData?: (data: any[]) => any[];
  mapSampleSubtype?: (sample: any) => string;
  getColorScale?: () => string;
  getTitle?: (params: any) => string;
  getZAxisTitle?: () => string;
  getYAxisTitle?: () => string;
  getZMid?: () => number;
  getClusterLegendTitle?: () => string;
};

@Component({
  selector: 'app-heatmap-plot',
  imports: [MatProgressBar, CommonModule],
  templateUrl: './heatmap-plot.component.html',
  styleUrl: './heatmap-plot.component.scss',
  standalone: true,
})
export class ReusableHeatmapComponent implements OnDestroy {
  backend = inject(BackendService);

  // Inputs
  dataSource = input.required<HeatmapDataSource>();
  params = input.required<any>();
  refreshSignal = input<any>(null);
  
  // Optional configuration inputs with defaults
  showSubtypes = input<boolean>(true);
  height = input<string>('600px');
  width = input<string>('100%');

  plotRendered = output<void>();
  
  heatmap = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');
  
  // Resource-based data fetching
  heatmapResource = resource({
    request: computed(() => {
      return {
        dataSource: this.dataSource(),
        params: this.params(),
        showSubtypes: this.showSubtypes()
      };
    }),
    loader: async (param) => {
      const { dataSource, params, showSubtypes } = param.request;
      
      // Fetch data using the data source
      const data = await dataSource.getData(params);
      
      // Apply transformation if provided
      const transformedData = dataSource.transformData ? dataSource.transformData(data) : data;
      
      // Return the data for use in the template and rendering
      return transformedData;
    }
  });
  
  // Effects for plot management
  private plotEffect = effect(() => {
    const data = this.heatmapResource.value();
    if (data) {
      this.renderHeatmap(data);
      this.plotRendered.emit();
    }
  });

  private refreshEffect = effect(() => {
    this.refreshSignal();
    this.refresh();
  });

  constructor() {}

  private subtype_text(sample: string, subtype: string): string {
    if (subtype === 'None' || subtype === 'null' || subtype === null || subtype === undefined) {
      subtype = 'NA';
    }
    return `${subtype} (${sample})`;
  }

  private renderHeatmap(data: any[]) {
    if (!data || data.length === 0) return;

    const heatmapEl = this.heatmap().nativeElement;
    const dataSource = this.dataSource();
    const params = this.params();

    // Extract samples and their subtypes
    const samples = this.extractSamples(data);
    
    // Create base heatmap
    const heatmapTrace = this.createHeatmapTrace(data, params.value_key);
    console.log('Heatmap trace:', heatmapTrace);
    
    // Determine if we need to show subtypes
    let plotData: any = [heatmapTrace];
    
    // Process subtypes if enabled and we have subtype data
    if (this.showSubtypes() && this.hasSubtypeData(samples)) {
      const { subtypeBar, subtypeLegend } = this.createSubtypeElements(samples);
      plotData = [subtypeBar, heatmapTrace, ...subtypeLegend];
    }

    // Create layout
    const layout = this.createLayout(samples, dataSource, params);
    
    // Create config
    const config = {
      responsive: true,
    };

    // Render plot
    Plotly.newPlot(heatmapEl, plotData, layout, config);
  }

  private extractSamples(data: any[]): { sample_ID: string, disease_subtype: string }[] {
    return [...new Set(data.map(e => ({ sample_ID: e.sample_ID, disease_subtype: e.disease_subtype || 'NA' })))];
  }

  private createHeatmapTrace(data: any[], value_key?: string) {
    const dataSource = this.dataSource();
    return {
      z: value_key ? data.map(e => e[value_key]) : data.map(e => e.expr_value),
      x: data.map(e => e.sample_ID),
      y: data.map(e => 'gene' in e ? e.gene.gene_symbol : (e.transcript ? e.transcript.enst_number : e.id)),
      type: 'heatmap',
      zmid: dataSource.getZMid ? dataSource.getZMid() : 0,
      showscale: true,
      showlegend: false,
      colorscale: dataSource.getColorScale ? dataSource.getColorScale() : "RdBu",
      colorbar: {
        len: 0.5,
        lenmode: 'fraction',
        title: dataSource.getZAxisTitle ? dataSource.getZAxisTitle() : 'Normalized<br>expression',
        xanchor: 'left',
        yanchor: 'bottom',
        x: 1.01,
        y: 0,
        ypad: 0,
      },
    };
  }

  private hasSubtypeData(samples: { sample_ID: string, disease_subtype: string }[]): boolean {
    const subtypes = [...new Set(samples.map(s => s.disease_subtype))];
    return subtypes.length > 1 && subtypes.some(s => s !== 'NA' && s !== 'None' && s !== null && s !== undefined);
  }

  private createSubtypeElements(samples: { sample_ID: string, disease_subtype: string }[]) {
    // Extract unique subtypes and map them to colors
    const subtypes = [...new Set(samples.map(s => s.disease_subtype)
      .filter(subtype => subtype !== 'None' && subtype !== 'null' && subtype && subtype !== 'NA'))];
    
    if (subtypes.length === 0) {
      subtypes.push('NA');
    }
    
    // Create color mapping
    const subtypeColors: { [key: string]: string } = {};
    subtypes.forEach((subtype, index) => {
      subtypeColors[subtype!] = `hsl(${(index * 360) / subtypes.length}, 70%, 50%)`;
    });
    
    // Add default colors
    subtypeColors['Unspecific'] = 'grey';
    subtypeColors['None'] = 'grey';
    subtypeColors['null'] = 'grey';
    subtypeColors['NA'] = 'grey';
    
    // Create subtype bar
    const subtypeBar = {
      x: samples.map(s => s.sample_ID),
      y: Array(samples.length).fill(1),
      type: 'bar',
      marker: {
        color: samples.map(s => subtypeColors[s.disease_subtype] || 'grey'),
      },
      hoverinfo: 'text',
      text: samples.map(s => this.subtype_text(s.sample_ID, s.disease_subtype)),
      showscale: false,
      xaxis: 'x',
      yaxis: 'y2',
      showlegend: false,
    };

    // Create legend elements
    const subtypeLegend = subtypes.map(subtype => ({
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: subtypeColors[subtype || 'NA'],
        size: 10
      },
      name: subtype,
      showlegend: true,
      title: {
        text: this.dataSource().getClusterLegendTitle?.() ?? 'Subtype',
      }
    }));

    return { subtypeBar, subtypeLegend };
  }

  private createLayout(samples: any[], dataSource: HeatmapDataSource, params: any) {
    const showSubtypes = this.showSubtypes() && this.hasSubtypeData(samples);
    
    const layout: any = {
      bargap: 0,
      autosize: true,
      grid: {
        rows: 2,
        columns: 1,
        subplots: [['xy2'], ['xy']],
        roworder: 'top to bottom',
        pattern: 'independent',
        ygap: 0.3,
      },
      title: dataSource.getTitle ? dataSource.getTitle(params) : 'Heatmap',
      xaxis: {
        ticks: '',
        showticklabels: false,
        title: 'Sample',
        automargin: true,
      },
      yaxis: {
        title: dataSource.getYAxisTitle ? dataSource.getYAxisTitle() : 'Gene',
        automargin: true,
        domain: [0, showSubtypes ? 0.9 : 1],
        showticklabels: true,
      },
      yaxis2: {
        automargin: true,
        showticklabels: true,
        tickvals: [2],
        ticktext: ['Subtype'],
        domain: showSubtypes ? [0.92, 1] : [0, 0],
        nticks: 1,
        tickmode: 'array',
        ticklabelstandoff: 5,
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      legend: {
        x: 1.01,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        title: {
          text: 'Subtype'
        },
      },
    };

    // Special case for pancancer
    if (params.disease && params.disease.disease_name === 'pancancer') {
      layout.legend.x = 1.15;
    }

    return layout;
  }

  refresh() {
    const heatmapEl = this.heatmap().nativeElement;
    if (heatmapEl.checkVisibility()) {
      Plotly.Plots.resize(heatmapEl);
    }
  }

  ngOnDestroy(): void {
    if (this.heatmap()) {
      Plotly.purge(this.heatmap().nativeElement);
    }
    this.plotEffect.destroy();
    this.refreshEffect.destroy();
  }

  static async handleDiseaseSubtypes(
    expressionData: any[],
    diseaseName: string,
    backend: BackendService
  ): Promise<void> {
    // Get the disease subtype
    const sampleInformation = await backend.getSampleInfo(undefined, diseaseName);
    const mapping: { [key: string]: string } = {};
    
    if (sampleInformation.length > 0) {
      sampleInformation.forEach((sample) => {
        const sampleID = sample.sample_ID;
        mapping[sampleID] = sample.disease.disease_subtype;
      });
      
      // Add the disease name to the expression data
      for (const e of expressionData) {
        // Extract patient ID from sample ID
        const patientID = e.sample_ID.split('-').slice(0, -1).join('-');
        e.disease_subtype = mapping[patientID] || 'NA';
      }
    }
  }

  static async mapSampleToDisease(sampleId: string, mapping: { [key: string]: string }): Promise<string> {
    // Extract the TSS code from the sample ID (format: TCGA-K1-A6RT-01___pancancer)
    const tssCode = sampleId.split('-')[1];
    
    // Use the mapping to get the disease name
    return mapping[tssCode] || 'Unknown';
  }
}