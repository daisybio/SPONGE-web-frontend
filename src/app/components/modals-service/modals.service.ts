import { inject, Injectable } from '@angular/core';
import {
  Gene,
  GeneInteraction,
  Transcript,
  TranscriptInteraction,
} from '../../interfaces';
import { GeneModalComponent } from '../gene-modal/gene-modal.component';
import { TranscriptModalComponent } from '../transcript-modal/transcript-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { InteractionModalComponent } from '../interaction-modal/interaction-modal.component';

@Injectable({
  providedIn: 'root',
})
export class ModalsService {
  private readonly dialog = inject(MatDialog);

  constructor() {}

  openNodeDialog(entity: Gene | Transcript) {
    if ('ensg_number' in entity) {
      this.dialog.open(GeneModalComponent, {
        data: entity,
        minWidth: '60vw',
        minHeight: '60vh',
      });
    } else {
      this.dialog.open(TranscriptModalComponent, {
        data: entity,
      });
    }
  }

  openMiRNADialog(interaction: GeneInteraction | TranscriptInteraction) {
    this.dialog.open(InteractionModalComponent, {
      data: interaction,
    });
  }
}
