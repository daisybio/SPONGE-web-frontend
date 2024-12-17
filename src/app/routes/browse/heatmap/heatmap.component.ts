import {Component, computed, effect, ElementRef, inject, input, OnDestroy, resource, viewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {BackendService} from "../../../services/backend.service";
import {VersionsService} from "../../../services/versions.service";
import {fromEvent} from "rxjs";
import {toSignal} from "@angular/core/rxjs-interop";
import {MatProgressSpinner} from "@angular/material/progress-spinner";

declare const Plotly: any;


@Component({
  selector: 'app-heatmap',
  imports: [
    MatProgressSpinner
  ],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss'
})
export class HeatmapComponent implements OnDestroy {
  browseService = inject(BrowseService);
  backend = inject(BackendService);
  versions = inject(VersionsService);

  refreshSignal = input.required<any>();
  heatmap = viewChild.required<ElementRef<HTMLDivElement>>('heatmap');

  windowResizeSignal = toSignal(fromEvent(window, 'resize'));

  plotData = resource({
    request: computed(() => {
      return {
        nodes: this.browseService.nodes$(),
        disease: this.browseService.disease$(),
        level: this.browseService.level$(),
        version: this.versions.versionReadOnly()()
      }
    }),
    loader: async (param) => {
      const nodes = param.request.nodes;
      const disease = param.request.disease;
      const version = param.request.version;
      const level = param.request.level;
      if (nodes === undefined || disease === undefined || level === undefined) return;

      const identifiers = nodes.map(node => BrowseService.getNodeID(node));

      const expression = await this.backend.getExpression(version, identifiers, disease, level);

      const expressionMap = new Map<string, Map<string, number>>();
      const samples = new Set<string>();
      for (const expr of expression) {
        const identifier = 'gene' in expr ? expr.gene.gene_symbol || expr.gene.ensg_number : expr.transcript.enst_number;
        if (!expressionMap.has(identifier)) {
          expressionMap.set(identifier, new Map<string, number>());
        }
        samples.add(expr.sample_ID);
        expressionMap.get(identifier)!.set(expr.sample_ID, expr.expr_value);
      }

      const geneSymbols = Array.from(expressionMap.keys());
      const sampleIDs = Array.from(samples);
      const values = geneSymbols.map(gene => sampleIDs.map(sample => expressionMap.get(gene)!.get(sample)));

      return {
        x: sampleIDs,
        y: geneSymbols,
        z: values,
        type: 'heatmap'
      };
    }
  });

  refreshEffect = effect(() => {
    this.refreshSignal();
    this.windowResizeSignal();

    this.refresh();
  });

  plotUpdateEffect = effect(() => {
    const data = this.plotData.value();
    if (!data) return;

    const heatmap = this.heatmap().nativeElement;

    Plotly.newPlot(heatmap, [data], {
      title: 'Expression heatmap',
      xaxis: {
        title: 'Sample ID'
      },
      yaxis: {
        title: 'Node'
      },
      margin: {
        b: 300,
        l: 200
      }
    });
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
