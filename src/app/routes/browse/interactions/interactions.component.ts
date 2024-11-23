import {Component, Signal} from '@angular/core';
import {CeRNAInteraction} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {MatTableModule} from "@angular/material/table";
import {InteractionsTableComponent} from "../../../components/interactions-table/interactions-table.component";

@Component({
  selector: 'app-interactions',
  imports: [MatTableModule, InteractionsTableComponent],
  templateUrl: './interactions.component.html',
  styleUrl: './interactions.component.scss'
})
export class InteractionsComponent {
  interactions$: Signal<CeRNAInteraction[]>;

  constructor(browseService: BrowseService) {
    this.interactions$ = browseService.interactions$;
  }
}
