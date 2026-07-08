import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { NetworkComponent } from '../browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../browse-views/active-entities/active-entities.component';
import { BrowseService } from '../../services/browse.service';
import { BackendService } from '../../services/backend.service';
import { VersionsService } from '../../services/versions.service';
import { CartItem } from '../../services/cart.service';
import { Dataset, Gene, GeneNode, NetworkData, Transcript } from '../../interfaces';

interface CartNetworkDialogData {
  items: CartItem[];
  disease: Dataset;
}

@Component({
  selector: 'app-cart-network-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    NetworkComponent,
    ActiveEntitiesComponent,
  ],
  providers: [BrowseService],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 10px;">
      <mat-icon style="color: #1565c0;">hub</mat-icon>
      Cart Network — {{ data.disease.disease_name }}
      <span style="font-size: 0.75em; color: #9e9e9e; margin-left: 8px;">
        ({{ data.items.length }} genes/transcripts)
      </span>
    </h2>
    <mat-dialog-content style="padding: 0; min-height: 60vh;">
      @if (isLoading()) {
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 16px;">
          <mat-spinner></mat-spinner>
          <p style="color: #666;">Fetching interactions…</p>
        </div>
      } @else if (error()) {
        <div style="padding: 24px; color: #c62828;">
          <mat-icon>error</mat-icon>
          {{ error() }}
        </div>
      } @else {
        <div style="display: flex; flex-direction: row; height: 60vh;">
          <app-network [browseService]="browseService" [refreshSignal]="refresh()"
            style="flex: 3; min-width: 0;"></app-network>
          <app-active-entities [browseService]="browseService"
            style="flex: 1; min-width: 200px; overflow-y: auto;"></app-active-entities>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
})
export class CartNetworkDialogComponent {
  data = inject<CartNetworkDialogData>(MAT_DIALOG_DATA);
  browseService = inject(BrowseService);
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  refresh = signal(0);

  constructor() {
    this.loadNetwork();
  }

  async loadNetwork() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const version = this.versionsService.versionReadOnly()();
      if (!version) throw new Error('No version selected');

      const identifiers = this.data.items.map(item =>
        item.type === 'gene'
          ? (item.entity as Gene).ensg_number
          : (item.entity as Transcript).enst_number
      );

      const level = this.data.items.some(i => i.type === 'transcript') ? 'transcript' : 'gene';

      const interactions = await this.backend.getInteractionsSpecific(
        version,
        this.data.disease,
        1.0,
        identifiers,
        level,
      );

      // Build node map
      const nodeMap = new Map<string, GeneNode>();
      for (const int of interactions) {
        if ('gene1' in int) {
          for (const g of [int.gene1, int.gene2]) {
            if (!nodeMap.has(g.ensg_number)) {
              nodeMap.set(g.ensg_number, {
                gene: g,
                betweenness: 0,
                eigenvector: 0,
                node_degree: 0,
                sponge_run: { dataset: { ...this.data.disease, disease_subtype: '' }, sponge_run_ID: 0 },
              } as GeneNode);
            }
          }
        }
      }

      // Add orphan nodes
      for (const item of this.data.items) {
        if (item.type === 'gene') {
          const g = item.entity as Gene;
          if (!nodeMap.has(g.ensg_number)) {
            nodeMap.set(g.ensg_number, {
              gene: g,
              betweenness: 0,
              eigenvector: 0,
              node_degree: 0,
              sponge_run: { dataset: { ...this.data.disease, disease_subtype: '' }, sponge_run_ID: 0 },
            } as GeneNode);
          }
        }
      }

      const networkData: NetworkData = {
        nodes: Array.from(nodeMap.values()),
        inverseNodes: [],
        edges: interactions,
        disease: this.data.disease,
      };

      this.browseService.setManualData(networkData);
      this.refresh.update(v => v + 1);
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to load network');
    } finally {
      this.isLoading.set(false);
    }
  }
}
