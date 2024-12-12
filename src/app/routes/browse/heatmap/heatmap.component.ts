import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnDestroy,
  resource,
  ViewChild
} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {BackendService} from "../../../services/backend.service";
import {VersionsService} from "../../../services/versions.service";
import {fromEvent, ReplaySubject} from "rxjs";

declare const Plotly: any;


@Component({
  selector: 'app-heatmap',
  imports: [],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss'
})
export class HeatmapComponent implements AfterViewInit, OnDestroy {
  refreshSignal = input.required<any>();
  @ViewChild('heatmap') heatmap!: ElementRef;
  plotData$ = new ReplaySubject();

  constructor(browseService: BrowseService, backend: BackendService, versions: VersionsService) {
    const plotData = resource({
      request: computed(() => {
        return {
          nodes: browseService.nodes$(),
          disease: browseService.disease$(),
          level: browseService.level$(),
          version: versions.versionReadOnly()()
        }
      }),
      loader: async (param) => {
        const nodes = param.request.nodes;
        const disease = param.request.disease;
        const version = param.request.version;
        const level = param.request.level;
        if (nodes === undefined || disease === undefined || level === undefined) return;

        const identifiers = nodes.map(node => BrowseService.getNodeID(node));

        const expression = await backend.getGeneExpression(version, identifiers, disease, level);

        const expressionMap = new Map<string, Map<string, number>>();
        const samples = new Set<string>();
        for (const expr of expression) {
          const geneID = expr.gene.gene_symbol || expr.gene.ensg_number;
          if (!expressionMap.has(geneID)) {
            expressionMap.set(geneID, new Map<string, number>());
          }
          samples.add(expr.sample_ID);
          expressionMap.get(geneID)!.set(expr.sample_ID, expr.expr_value);
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

    effect(() => {
      this.plotData$.next(plotData.value());
    });

    effect(() => {
      this.refreshSignal();
      this.refresh();
    });
  }

  ngAfterViewInit(): void {
    this.plotData$.subscribe(data => {
      if (!data) return;

      Plotly.newPlot(this.heatmap.nativeElement, [data], {
        title: 'Heatmap of gene expression',
        xaxis: {
          title: 'Sample ID'
        },
        yaxis: {
          title: 'Gene'
        },
        margin: {
          b: 300
        }
      });
    });

    fromEvent(window, 'resize').subscribe(() => {
      this.refresh();
    });
  }

  refresh() {
    if (this.heatmap && this.heatmap.nativeElement.checkVisibility()) {
      Plotly.Plots.resize(this.heatmap.nativeElement);
    }
  }

  ngOnDestroy(): void {
    Plotly.purge(this.heatmap.nativeElement);
  }
}
