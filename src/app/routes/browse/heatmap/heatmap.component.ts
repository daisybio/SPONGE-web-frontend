import {AfterViewInit, Component, effect, ElementRef, ViewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {ReplaySubject} from "rxjs";
import {BackendService} from "../../../services/backend.service";

declare const Plotly: any;


@Component({
  selector: 'app-heatmap',
  imports: [],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss'
})
export class HeatmapComponent implements AfterViewInit {
  @ViewChild('heatmap') heatmap!: ElementRef;
  plotData$ = new ReplaySubject<any>();

  constructor(browseService: BrowseService, backend: BackendService) {
    effect(async () => {
      const ceRNAs = browseService.ceRNAs$();
      const disease = browseService.disease$();
      if (disease === undefined) return;

      const ensgs = ceRNAs.map(ceRNA => ceRNA.gene.ensg_number);

      const expression = await backend.getCeRNAExpression(ensgs, disease.disease_name);
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

      this.plotData$.next({
        x: sampleIDs,
        y: geneSymbols,
        z: values,
        type: 'heatmap'
      });
    });
  }

  ngAfterViewInit(): void {
    this.plotData$.subscribe(data => {
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
  }
}
