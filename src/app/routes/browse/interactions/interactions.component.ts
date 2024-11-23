import {Component, computed, Signal} from '@angular/core';
import {CeRNAInteraction} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {MatTableModule} from "@angular/material/table";

@Component({
  selector: 'app-interactions',
  imports: [MatTableModule],
  templateUrl: './interactions.component.html',
  styleUrl: './interactions.component.scss'
})
export class InteractionsComponent {
  columns = ["gene_1", "gene_2", "correlation", "mscor", "padj", "id"];
  interactions$: Signal<CeRNAInteraction[] | undefined>;

  constructor(private browseService: BrowseService) {
    this.interactions$ = computed(() => this.browseService.data$()?.interactions);
  }
}
