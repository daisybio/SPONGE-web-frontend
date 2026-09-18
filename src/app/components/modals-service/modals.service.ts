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

  openNodeDialog(entity: any, disease?: Dataset) {
    let nodeData: any;
    if (entity && typeof entity === 'object') {
      if ('transcript' in entity && entity.transcript) {
        // TranscriptNode wrapper
        nodeData = {
          ...entity.transcript,
          disease: disease ?? entity.dataset ?? entity.sponge_run?.dataset ?? null,
          disease_name: disease?.disease_name ?? entity.disease_name ?? entity.dataset?.disease_name ?? entity.transcript?.disease_name ?? null,
          betweenness: entity.betweenness ?? null,
          eigenvector: entity.eigenvector ?? null,
          node_degree: entity.node_degree ?? null,
        };
      } else if ('enst_number' in entity) {
        // Transcript object (may also have a parent .gene reference)
        nodeData = {
          ...entity,
          disease: disease ?? entity.dataset ?? entity.sponge_run?.dataset ?? null,
          disease_name: disease?.disease_name ?? entity.disease_name ?? entity.dataset?.disease_name ?? null,
          betweenness: entity.betweenness ?? null,
          eigenvector: entity.eigenvector ?? null,
          node_degree: entity.node_degree ?? null,
        };
      } else if ('gene' in entity && entity.gene) {
        // GeneNode wrapper
        nodeData = {
          ...entity.gene,
          disease: disease ?? entity.dataset ?? entity.sponge_run?.dataset ?? null,
          disease_name: disease?.disease_name ?? entity.disease_name ?? entity.dataset?.disease_name ?? entity.gene?.disease_name ?? null,
          betweenness: entity.betweenness ?? null,
          eigenvector: entity.eigenvector ?? null,
          node_degree: entity.node_degree ?? null,
        };
      } else {
        // Direct Gene or other node object
        nodeData = {
          ...entity,
          disease: disease ?? entity.dataset ?? entity.sponge_run?.dataset ?? null,
          disease_name: disease?.disease_name ?? entity.disease_name ?? entity.dataset?.disease_name ?? null,
        };
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
    if (nodeData && 'enst_number' in nodeData) {
      this.dialog.open(TranscriptModalComponent, dialogConfig);
    } else {
      this.dialog.open(GeneModalComponent, dialogConfig);
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
