import {Component, computed, effect, ElementRef, input, OnInit, resource, ResourceRef, ViewChild} from '@angular/core';
import {Dataset, Gene, GeneNode, SurvivalRate} from "../../../../interfaces";
import {BackendService} from "../../../../services/backend.service";
import {MatCardModule} from "@angular/material/card";
import {compute} from "@fullstax/kaplan-meier-estimator";
import {VersionsService} from "../../../../services/versions.service";
import {ReplaySubject} from "rxjs";
import {MatProgressBar} from "@angular/material/progress-bar";

declare const Plotly: any;

interface CombinedPlotData {
  overexpressed: any;
  underexpressed: any;
  pValue: number;
  gene: Gene;
  disease: Dataset;
}

@Component({
  selector: 'app-kmplot',
  imports: [
    MatCardModule,
    MatProgressBar
  ],
  templateUrl: './kmplot.component.html',
  styleUrl: './kmplot.component.scss'
})
export class KMPlotComponent implements OnInit {
  ceRNA = input.required<GeneNode>()
  disease = input.required<Dataset>()
  @ViewChild("plot") plot!: ElementRef;

  plotDataResource: ResourceRef<CombinedPlotData | undefined>;
  plotData = new ReplaySubject<CombinedPlotData | undefined>();

  constructor(private backend: BackendService, versionsService: VersionsService) {
    const config = computed(() => {
      return {
        gene: this.ceRNA().gene,
        disease: this.disease(),
        version: versionsService.versionReadOnly()(),
      }
    });

    this.plotDataResource = resource({
      request: config,
      loader: async (param) => {
        const pVals$ = this.backend.getSurvivalPValues(param.request.version, [param.request.gene.ensg_number], param.request.disease);
        const surivialRates$ = this.backend.getSurvivalRates(param.request.version, [param.request.gene.ensg_number], param.request.disease);

        const [pVals, survivalRates] = await Promise.all([pVals$, surivialRates$]);

        if (pVals.length === 0) {
          return undefined;
        }

        const pValue = pVals[0].pValue;

        const overExpressed = survivalRates.filter((rate) => rate.overexpression === 1)
        const underExpressed = survivalRates.filter((rate) => rate.overexpression === 0);

        return {
          overexpressed: this.getPlotData(overExpressed, 'Overexpressed'),
          underexpressed: this.getPlotData(underExpressed, 'Underexpressed'),
          pValue,
          gene: param.request.gene,
          disease: param.request.disease
        };
      }
    });

    effect(() => {
      this.plotData.next(this.plotDataResource.value());
    });
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }

  ngOnInit(): void {
    this.plotData.subscribe((data) => {
      if (data === undefined) {
        return;
      }

      const pValue = data.pValue;

      Plotly.newPlot(this.plot.nativeElement, [
        data.overexpressed,
        data.underexpressed
      ], {
        title: `Survival Analysis for ${this.getGenePrimary(data.gene)} in ${data.disease.disease_name}<br>P-value: ${pValue}`,
        xaxis: {
          title: 'Time (days)'
        },
        yaxis: {
          title: 'Survival Rate'
        }
      });
    });
  }

  getPlotData(rates: SurvivalRate[], name: string) {
    const sortedRates = rates.sort((a, b) => a.patient_information.survival_time - b.patient_information.survival_time);
    const times = sortedRates.map((rate) => rate.patient_information.survival_time);
    const events = sortedRates.map((rate) => rate.patient_information.disease_status === 0);
    const result = compute(times, events);
    return {
      x: result.map((point) => point.time),
      y: result.map((point) => point.rate),
      type: 'scatter',
      name
    }
  }
}
