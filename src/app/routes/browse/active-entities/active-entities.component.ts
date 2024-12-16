import {Component, inject} from '@angular/core';
import {MatTabsModule} from "@angular/material/tabs";
import {BrowseService} from "../../../services/browse.service";
import {Gene, GeneInteraction, Transcript, TranscriptInteraction} from "../../../interfaces";
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {GeneModalComponent} from "../../../components/gene-modal/gene-modal.component";
import {MatButton} from "@angular/material/button";
import {TranscriptModalComponent} from "../../../components/transcript-modal/transcript-modal.component";
import {InteractionModalComponent} from "../../../components/interaction-modal/interaction-modal.component";

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
  readonly dialog = inject(MatDialog);
  protected BrowseService = BrowseService;
  protected readonly browseService = inject(BrowseService);
  nodes$ = this.browseService.activeNodes$;
  edges$ = this.browseService.activeInteractions$;

  openInteractionModal(interaction: GeneInteraction | TranscriptInteraction): void {
    console.log(interaction);
    this.dialog.open(InteractionModalComponent, {
      data: interaction
    });
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
