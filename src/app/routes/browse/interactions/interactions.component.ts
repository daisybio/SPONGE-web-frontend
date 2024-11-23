import {Component, Signal} from '@angular/core';
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
  interactions$: Signal<CeRNAInteraction[]>;

  constructor(browseService: BrowseService) {
    this.interactions$ = browseService.interactions$;
  }
}
