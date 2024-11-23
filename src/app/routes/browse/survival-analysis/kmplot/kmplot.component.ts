import {Component, Input, OnInit} from '@angular/core';
import {CeRNA, Dataset, Gene} from "../../../../interfaces";
import {BackendService} from "../../../../services/backend.service";
import {MatCardModule} from "@angular/material/card";

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

  constructor(private backend: BackendService) {
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }

  ngOnInit(): void {
    const survivalRates$ = this.backend.getSurvivalRates([this.ceRNA.gene.ensg_number], this.disease.disease_name);
    const survivalPValues$ = this.backend.getSurvivalPValues([this.ceRNA.gene.ensg_number], this.disease.disease_name);

    Promise.all([survivalRates$, survivalPValues$]).then(resp => {
      const [survivalRates, pValues] = resp;
      console.log(survivalRates)
    });
  }
}
