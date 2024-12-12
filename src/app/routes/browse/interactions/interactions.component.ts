import {Component, Signal} from '@angular/core';
import {GeneInteraction} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {InteractionsTableComponent} from "../../../components/interactions-table/interactions-table.component";

@Component({
  selector: 'app-interactions',
  imports: [InteractionsTableComponent],
  templateUrl: './interactions.component.html',
  styleUrl: './interactions.component.scss'
})
export class InteractionsComponent {
  interactions$: Signal<GeneInteraction[]>;

  constructor(browseService: BrowseService) {
    this.interactions$ = browseService.interactions$;
  }
}
