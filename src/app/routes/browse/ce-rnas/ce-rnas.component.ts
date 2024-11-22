import {Component, computed, Signal} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {CeRNA} from "../../../interfaces";
import {MatTableModule} from "@angular/material/table";

@Component({
  selector: 'app-ce-rnas',
  imports: [MatTableModule],
  templateUrl: './ce-rnas.component.html',
  styleUrl: './ce-rnas.component.scss'
})
export class CeRNAsComponent {
  columns = ["ensg_number", "gene_symbol", "betweenness", "eigenvector", "node_degree"];
  ceRNAs$: Signal<CeRNA[]>;

  constructor(private browseService: BrowseService) {
    this.ceRNAs$ = computed(() => this.browseService.data$().ceRNAs);
  }
}
