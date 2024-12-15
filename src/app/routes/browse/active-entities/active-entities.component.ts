import {Component, inject, Signal} from '@angular/core';
import {MatTabsModule} from "@angular/material/tabs";
import {BrowseService} from "../../../services/browse.service";
import {Gene, GeneInteraction, GeneNode, Transcript, TranscriptInteraction, TranscriptNode} from "../../../interfaces";
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {GeneModalComponent} from "../../../components/gene-modal/gene-modal.component";
import {MatButton} from "@angular/material/button";
import {TranscriptModalComponent} from "../../../components/transcript-modal/transcript-modal.component";

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
  nodes$: Signal<(GeneNode | TranscriptNode)[]>
  edges$: Signal<(GeneInteraction | TranscriptInteraction)[]>
  readonly dialog = inject(MatDialog);
  protected readonly BrowseService = BrowseService;

  constructor(browseService: BrowseService) {
    this.nodes$ = browseService.activeNodes$;
    this.edges$ = browseService.activeInteractions$;
  }

  openModal(entity: Gene | Transcript): void {
    if ('ensg_number' in entity) {
      this.dialog.open(GeneModalComponent, {
        data: entity
      })
    } else {
      this.dialog.open(TranscriptModalComponent, {
        data: entity
      })
    }
  }
}
