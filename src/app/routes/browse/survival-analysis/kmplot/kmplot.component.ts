import {Component, computed, effect, ElementRef, input, OnInit, resource, ViewChild} from '@angular/core';
import {CeRNA, Dataset, Gene, SurvivalRate} from "../../../../interfaces";
import {BackendService} from "../../../../services/backend.service";
import {MatCardModule} from "@angular/material/card";
import {compute} from "@fullstax/kaplan-meier-estimator";
import {VersionsService} from "../../../../services/versions.service";
import {ReplaySubject} from "rxjs";

declare const Plotly: any;


@Component({
  selector: 'app-kmplot',
  imports: [
    MatCardModule
  ],
  templateUrl: './kmplot.component.html',
  styleUrl: './kmplot.component.scss'
})
export class KMPlotComponent implements OnInit {
  ceRNA = input.required<CeRNA>()
  disease = input.required<Dataset>()
  @ViewChild("plot") plot!: ElementRef;

  plotData = new ReplaySubject<any>();

  constructor(private backend: BackendService, versionsService: VersionsService) {
    const config = computed(() => {
      return {
        gene: this.ceRNA().gene,
        disease: this.disease().disease_name,
        version: versionsService.versionReadOnly()(),
      }
    });

    const plotDataResource = resource({
      request: config,
      loader: async (param) => {
        const pVals$ = this.backend.getSurvivalPValues(param.request.version, [param.request.gene.ensg_number], param.request.disease);
        const surivialRates$ = this.backend.getSurvivalRates(param.request.version, [param.request.gene.ensg_number], param.request.disease);

        const [pVals, survivalRates] = await Promise.all([pVals$, surivialRates$]);

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
      this.plotData.next(plotDataResource.value());
    });
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }

  ngOnInit(): void {
    this.plotData.subscribe((data) => {
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
