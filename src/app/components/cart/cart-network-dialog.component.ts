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
import {
  Dataset,
  Gene,
  GeneNode,
  InteractionSorting,
  NetworkData,
  Transcript,
  TranscriptNode,
} from '../../interfaces';

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

      const level = this.data.items.some(i => i.type === 'transcript') ? 'transcript' : 'gene';

      const identifiers = this.data.items
        .filter(item => item.type === level)
        .map(item =>
          level === 'gene'
            ? (item.entity as Gene).ensg_number
            : (item.entity as Transcript).enst_number
        );

      const network = await this.backend.getNetwork(version, {
        level,
        dataset: this.data.disease,
        ensemblID: identifiers,
        showOrphans: true,
        sortingDegree: false,
        sortingEigenvector: false,
        sortingBetweenness: false,
        maxNodes: Math.max(100, identifiers.length + 50),
        minDegree: 0,
        minBetweenness: 0,
        minEigen: 0,
        interactionSorting: 'mscor' as any,
        maxInteractions: 50000,
        maxPValue: 1.0,
        minMscor: 0,
      });

      // Build node map from fetched network nodes (contains real DB node_degree, betweenness, etc.)
      const nodeMap = new Map<string, GeneNode | TranscriptNode>();
      for (const node of network.nodes || []) {
        nodeMap.set(BrowseService.getNodeID(node), node);
      }

      // Ensure every cart item of this level is present, even if it has no DB networkAnalysis row
      for (const item of this.data.items) {
        if (item.type !== level) continue;
        const id = item.type === 'gene'
          ? (item.entity as Gene).ensg_number
          : (item.entity as Transcript).enst_number;

        if (!nodeMap.has(id)) {
          const spongeRun = {
            dataset: { ...this.data.disease, disease_subtype: '' },
            sponge_run_ID: 0,
          };
          if (item.type === 'gene') {
            nodeMap.set(id, {
              gene: item.entity as Gene,
              betweenness: null,
              eigenvector: null,
              node_degree: null,
              sponge_run: spongeRun,
            } as GeneNode);
          } else {
            nodeMap.set(id, {
              transcript: item.entity as Transcript,
              betweenness: null,
              eigenvector: null,
              node_degree: null,
              sponge_run: spongeRun,
            } as TranscriptNode);
          }
        }
      }

      const networkData: NetworkData = {
        nodes: Array.from(nodeMap.values()),
        inverseNodes: [],
        edges: network.edges || [],
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
