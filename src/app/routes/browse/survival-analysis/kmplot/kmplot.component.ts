import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {CeRNA, Dataset, Gene, SurvivalRate} from "../../../../interfaces";
import {BackendService} from "../../../../services/backend.service";
import {MatCardModule} from "@angular/material/card";
import {compute} from "@fullstax/kaplan-meier-estimator";

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
  @Input({required: true}) ceRNA!: CeRNA;
  @Input({required: true}) disease!: Dataset;
  @ViewChild("plot") plot!: ElementRef;

  constructor(private backend: BackendService) {
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }

  ngOnInit(): void {
    const survivalRates$ = this.backend.getSurvivalRates([this.ceRNA.gene.ensg_number], this.disease.disease_name);
    const survivalPValues$ = this.backend.getSurvivalPValues([this.ceRNA.gene.ensg_number], this.disease.disease_name);

    Promise.all([survivalRates$, survivalPValues$]).then(([survivalRates, survivalPValues]) => {
      const pValue = survivalPValues[0].pValue;
      const overExpressed = survivalRates.filter((rate) => rate.overexpression === 1)
      const underExpressed = survivalRates.filter((rate) => rate.overexpression === 0);

      Plotly.newPlot(this.plot.nativeElement, [
        this.getPlotData(overExpressed, 'Overexpressed'),
        this.getPlotData(underExpressed, 'Underexpressed')
      ], {
        title: `Survival Analysis for ${this.getGenePrimary(this.ceRNA.gene)} in ${this.disease.disease_name}<br>P-value: ${pValue}`,
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
