import {Component, Signal} from '@angular/core';
import {MatTabsModule} from "@angular/material/tabs";
import {BrowseService} from "../../../services/browse.service";
import {CeRNA, CeRNAInteraction, Gene} from "../../../interfaces";
import {MatCardModule} from "@angular/material/card";

@Component({
  selector: 'app-active-entities',
  imports: [
    MatTabsModule,
    MatCardModule
  ],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.scss'
})
export class ActiveEntitiesComponent {
  nodes$: Signal<CeRNA[]>
  edges$: Signal<CeRNAInteraction[]>

  constructor(browseService: BrowseService) {
    this.nodes$ = browseService.activeCeRNAs$;
    this.edges$ = browseService.activeInteractions$;
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }
}
