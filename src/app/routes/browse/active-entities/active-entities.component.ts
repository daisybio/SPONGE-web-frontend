import {Component, inject, Signal} from '@angular/core';
import {MatTabsModule} from "@angular/material/tabs";
import {BrowseService} from "../../../services/browse.service";
import {CeRNA, CeRNAInteraction, Gene} from "../../../interfaces";
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {GeneModalComponent} from "../../../components/gene-modal/gene-modal.component";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-active-entities',
  imports: [
    MatTabsModule,
    MatCardModule,
    MatButton
  ],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.scss'
})
export class ActiveEntitiesComponent {
  nodes$: Signal<CeRNA[]>
  edges$: Signal<CeRNAInteraction[]>
  readonly dialog = inject(MatDialog);

  constructor(browseService: BrowseService) {
    this.nodes$ = browseService.activeCeRNAs$;
    this.edges$ = browseService.activeInteractions$;
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }

  openGeneModal(gene: Gene): void {
    this.dialog.open(GeneModalComponent, {
      data: gene
    })
  }
}
