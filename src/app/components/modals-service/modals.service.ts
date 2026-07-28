import { inject, Injectable } from '@angular/core';
import {
  Dataset,
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

  openNodeDialog(entity: any) {
    let nodeData: any;
    if (entity && typeof entity === 'object') {
      if ('gene' in entity && entity.gene) {
        nodeData = {
          ...entity.gene,
          disease_name: entity.disease_name ?? entity.dataset?.disease_name ?? entity.gene?.disease_name ?? null,
          betweenness: entity.betweenness ?? null,
          eigenvector: entity.eigenvector ?? null,
          node_degree: entity.node_degree ?? null,
        };
      } else if ('transcript' in entity && entity.transcript) {
        nodeData = {
          ...entity.transcript,
          disease_name: entity.disease_name ?? entity.dataset?.disease_name ?? entity.transcript?.disease_name ?? null,
          betweenness: entity.betweenness ?? null,
          eigenvector: entity.eigenvector ?? null,
          node_degree: entity.node_degree ?? null,
        };
      } else {
        nodeData = entity;
      }
    } else {
      nodeData = entity;
    }

    // Fixed size (not min*) so the dialog does not resize when switching tabs; the tab content
    // scrolls inside a constant-height surface (see the .fixed-modal rules in styles.scss).
    const dialogConfig = {
      data: nodeData,
      width: '70vw',
      height: '80vh',
      maxWidth: '90vw',
      panelClass: 'fixed-modal',
    };
    if (nodeData && 'ensg_number' in nodeData) {
      this.dialog.open(GeneModalComponent, dialogConfig);
    } else {
      this.dialog.open(TranscriptModalComponent, dialogConfig);
    }
  }

  openMiRNADialog(
    interaction: GeneInteraction | TranscriptInteraction,
    disease: Dataset
  ) {
    this.dialog.open(InteractionModalComponent, {
      data: { interaction, disease },
      minWidth: '60vw',
    });
  }
}
