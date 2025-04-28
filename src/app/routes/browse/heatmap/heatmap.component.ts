import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  resource,
  viewChild,
} from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { BackendService } from '../../../services/backend.service';
import { VersionsService } from '../../../services/versions.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { capitalize } from 'lodash';

declare const Plotly: any;

@Component({
  selector: 'app-heatmap',
  imports: [MatProgressSpinner],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
})
export class HeatmapComponent implements OnDestroy {
  browseService = inject(BrowseService);
  backend = inject(BackendService);
  versions = inject(VersionsService);

  level$ = this.browseService.level$;
  refreshSignal = input.required<any>();
  heatmap = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');

  private subtype_text(e: any): string {
    let subtype = e.dataset.disease_subtype || 'Unspecific';
    if (subtype === 'None' || subtype === 'null') {
      subtype = 'Unspecific';
    }
    return `${subtype} (${e.sample_ID})`
  }


  private async mapSampleToDisease(sample_ID: string, mapping: { [key: string]: string }): Promise<string> {
    // a sample ID has the form TCGA-K1-A6RT-01___pancancer. Extract the TSS code which is in this case K1
    const tssCode = sample_ID.split('-')[1];
    // use the mapping to get the disease name
    const diseaseName = mapping[tssCode];
    if (diseaseName) {
      return diseaseName;
    } else {
      return 'Unknown';
    }
  }

  plotData = resource({
    request: computed(() => {
      return {
        nodes: this.browseService.nodes$(),
        disease: this.browseService.disease$(),
        level: this.browseService.level$(),
        version: this.versions.versionReadOnly()(),
      };
    }),
    loader: async (param) => {
      const nodes = param.request.nodes;
      const disease = param.request.disease;
      const version = param.request.version;
      const level = param.request.level;
      if (nodes === undefined || disease === undefined || level === undefined)
        return;

      const identifiers = nodes.map((node) => BrowseService.getNodeID(node));

      const CHUNK_SIZE = 1000;
      const N_PARALLEL_REQUESTS = 5;
      const expressionPromises = [];
      let hasMoreData = true;
      let offset = 0;
      while (hasMoreData) {
        // Fetch multiple pages in parallel
        const pagePromises = Array.from({ length: N_PARALLEL_REQUESTS }, (_, i) => {
          const currentOffset = offset + i * CHUNK_SIZE;
          return this.backend.getExpression(version, identifiers, disease.disease_name, disease.dataset_ID, level, CHUNK_SIZE, currentOffset, true);
        });
    
        const pageResults = await Promise.all(pagePromises);
    
        // Flatten and add results
        for (const page of pageResults) {
          if (page.length > 0) {
            expressionPromises.push(...page);
          }
          // If a page has fewer rows than CHUNK_SIZE, we've reached the end
          if (page.length < CHUNK_SIZE) {
            hasMoreData = false;
          }
        }
    
        offset += CHUNK_SIZE * N_PARALLEL_REQUESTS; // Move to the next batch of pages
      }
      const expressionData = expressionPromises.flat();

          // special case Pancancer: there is no disease name in the expression response so we need to fetch this separately 
      // because we want to show it in the heatmap
      if (disease.disease_name === 'pancancer') {
        // fetch the mapping from TSS codes to disease names
        const mapping = await this.backend.getDiseaseFromSample()
        // add the disease name to the expression data in the field disease_subtype
        for (const e of expressionData) {
          const sample_ID = e.sample_ID;
          const diseaseName = await this.mapSampleToDisease(sample_ID, mapping);
          e.dataset.disease_subtype = diseaseName;
        }
      } else {
        // get the disease subtype
        console.log('disease name', disease.disease_name)
        const sampleInformation = await this.backend.getSampleInfo(undefined, disease.disease_name)
        console.log('sample information', sampleInformation)
        const mapping: { [key: string]: string } = {};
        if (sampleInformation.length > 0) {
          sampleInformation.forEach((sample) => {
            const sampleID = sample.sample_ID;
            mapping[sampleID] = sample.disease.disease_subtype;
          });
          // add the disease name to the expression data in the field disease_subtype
          console.log('subtype mapping', mapping)
          for (const e of expressionData) {
            // sample_ID has the form TCGA-DH-A7UR-01___None. We need TCGA-DH-A7UR as the patient ID (without everything from the last - on)
            const patientID = e.sample_ID.split('-').slice(0, -1).join('-');
            e.dataset.disease_subtype = mapping[patientID]
            console.log('sample ID', e.sample_ID, "patient ID: ", patientID, 'disease subtype', e.dataset.disease_subtype)
          }
          console.log('expression data', expressionData)
        }
      }

      const expressionMap = new Map<string, Map<string, number>>();
      const samples = new Set<string>();
      for (const expr of expressionData) {
        const identifier =
          'gene' in expr
            ? expr.gene.gene_symbol || expr.gene.ensg_number
        : expr.transcript.enst_number;

        if (!expressionMap.has(identifier)) {
          expressionMap.set(identifier, new Map<string, number>());
        }
        samples.add(expr.sample_ID);
        expressionMap.get(identifier)!.set(expr.sample_ID, expr.expr_value);
      }


      const geneSymbols = Array.from(expressionMap.keys());
      const sampleIDs = Array.from(samples);
      const values = geneSymbols.map((gene) =>
        sampleIDs.map((sample) => expressionMap.get(gene)!.get(sample)),
      );

      const heatmap =  {
        x: sampleIDs,
        y: geneSymbols,
        z: values,
        type: 'heatmap',
        zmid: 0,
        showscale: true, 
        showlegend: false, 
        colorscale: "RdBu", 
        colorbar: {
          len: 0.5,
          lenmode: 'fraction',
          // nticks: 3,
          title: 'Normalized<br>expression',
          xanchor: 'left',
          yanchor: 'bottom',
          x: 1.01, 
          y: 0,
          ypad: 0, 
        },
      };

      // Extract unique subtypes and map them to colors
      const subtypes = [...new Set(expressionData.map(e => e.dataset.disease_subtype))];
      if (subtypes.length > 1) {
        const subtypeColors: { [key: string]: string } = {};
        subtypes.forEach((subtype, index) => {
          subtypeColors[index] = `hsl(${(index * 360) / subtypes.length}, 70%, 50%)`; // Generate unique colors
        });

        // Create a color bar for subtypes
        const subtypeBar = {
          x: expressionData.map(e => e.sample_ID),
          // y needs to be a list of the length of expressionData
          y: expressionData.map(e => 1),
          type: 'bar',
          marker: {
            color: expressionData.map(e => subtypeColors[subtypes.indexOf(e.dataset.disease_subtype).toString()]),
          },
          hoverinfo: 'text',
          // text should contain the subtype and the sample ID
          text: expressionData.map(e => this.subtype_text(e)),
          showscale: false,
          xaxis: 'x',
          yaxis: 'y2',
          showlegend: false,
        };



        // Add a custom legend for subtypes
        const subtypeLegend = subtypes.map((subtype, index) => ({
          x: [null], // Off-screen point
          y: [null],
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: subtypeColors[index.toString()],
            size: 10
          },
          name: subtype,
          showlegend: true,
          legendgroup: 'subtypes'
        }));

        // if disease is pancancer, put the legend below the plot
        // if (is_pancancer) {
        //   layout.legend!.x = 1.15;
        // }

        // only subtype bar if unspecific disease is selected
        // if (subtypes.length === 1 && subtypes[0] === 'None') {
        // }
        // return  [subtypeBar, heatmap, ...subtypeLegend]
        return [subtypeBar, heatmap, ...subtypeLegend];
      }
      else {
        return [heatmap];
      }
    },
  });

  refreshEffect = effect(() => {
    this.refreshSignal();
    this.refresh();
  });

  plotUpdateEffect = effect(() => {
    const data = this.plotData.value();
    if (!data) return;

    const heatmap = this.heatmap().nativeElement;

    const layout = {
      autosize: true,
      grid: {
        rows: 2,
        columns: 1,
        subplots: [['xy2'], ['xy']],
        roworder: 'top to bottom',
        pattern: 'independent',
        ygap: 0.3,
      },
      title: `${capitalize(this.level$())} Expression Heatmap - ${capitalize(this.browseService.disease$()?.disease_name)}`,
      xaxis: {
        // I think sample IDs are not necessary
        ticks: '',
        showticklabels: false,
        title: 'Sample',
        automargin: true,
      },
      yaxis: {
        title: capitalize(this.level$()),
        automargin: true,
        domain: [0, 0.9],
      },
      yaxis2: {
        // title: {
        //   text: 'Subtype',
        //   standoff: 5,
        // },
        automargin: true,
        showticklabels: true,
        tickvals: [2],
        ticktext: ['Subtype'],
        domain: [0.92, 1],
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
    }

    const config = {
      responsive: true,
    };

    if (data.length == 1) {
      // if there are not subtypes, remove the second yaxis
      layout.yaxis2.domain = [0, 0]
      layout.yaxis2.domain = [1, 1]
      console.log('if', data)
    };

    if (this.browseService.disease$() && this.browseService.disease$()!.disease_name === 'pancancer') {
      // if disease is pancancer, put the legend below the plot
      layout.legend!.x = 1.15;
    }


    Plotly.newPlot(heatmap, data, layout, config);
    // Plotly.newPlot(heatmap, [subtypeBar, heatmap, ..subtypeLegend], layout, {
  });

  refresh() {
    const heatmap = this.heatmap().nativeElement;
    if (heatmap.checkVisibility()) {
      Plotly.Plots.resize(heatmap);
    }
  }

  ngOnDestroy(): void {
    Plotly.purge(this.heatmap().nativeElement);
    this.refreshEffect.destroy();
    this.plotUpdateEffect.destroy();
  }
}
