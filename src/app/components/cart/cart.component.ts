import {
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CartService, CartItem } from '../../services/cart.service';
import { getDiseaseDisplayName, sortDiseaseObjects } from '../../cancer-colors';
import { InfoComponent } from '../info/info.component';
import { ModalsService } from '../modals-service/modals.service';
import { Gene, Transcript, Dataset } from '../../interfaces';
import { BackendService } from '../../services/backend.service';
import { VersionsService } from '../../services/versions.service';
import { CartNetworkDialogComponent } from './cart-network-dialog.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
    MatListModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
    InfoComponent,
  ],
  animations: [
    trigger('slideInOut', [
      state('open', style({ transform: 'translateX(0)', opacity: 1 })),
      state('closed', style({ transform: 'translateX(110%)', opacity: 0 })),
      transition('closed => open', [animate('250ms ease-out')]),
      transition('open => closed', [animate('200ms ease-in')]),
    ]),
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  cartService = inject(CartService);
  modalsService = inject(ModalsService);
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);
  private dialog = inject(MatDialog);

  isOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<Gene[]>([]);
  isSearching = signal(false);
  loadingModuleMembers = signal<string | null>(null);
  loadingTranscripts = signal<string | null>(null);

  // Dataset loading via resource
  private datasetsResource = resource({
    params: () => this.versionsService.versionReadOnly()(),
    loader: async ({ params: version }) => {
      if (!version) return [];
      return await this.backend.getDatasets(version);
    }
  });

  datasets = computed(() => this.datasetsResource.value() ?? []);
  sortedDatasets = computed(() => sortDiseaseObjects(this.datasets()));
  selectedDisease = signal<Dataset | null>(null);
  protected readonly getDiseaseDisplayName = getDiseaseDisplayName;

  items = this.cartService.items;
  count = this.cartService.count;

  constructor() {
    // Auto-select first disease when datasets load
    effect(() => {
      const ds = this.sortedDatasets();
      if (ds.length > 0 && !this.selectedDisease()) {
        this.selectedDisease.set(ds[0]);
      }
    });

  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  openEntity(item: CartItem) {
    this.modalsService.openNodeDialog(item.entity as Gene | Transcript);
  }

  removeItem(item: CartItem) {
    this.cartService.remove(item.id);
  }

  clearAll() {
    this.cartService.clear();
  }

  isGene(item: CartItem): boolean {
    return item.type === 'gene';
  }

  getGene(item: CartItem): Gene {
    return item.entity as Gene;
  }

  async searchGene(query: string) {
    if (!query || query.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }
    const version = this.versionsService.versionReadOnly()();
    if (!version) return;
    this.isSearching.set(true);
    try {
      const results = await this.backend.getAutocomplete(version, query.trim());
      this.searchResults.set(results || []);
    } catch (e) {
      this.searchResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  addFromSearch(gene: Gene) {
    this.cartService.add(gene);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  async addModuleMembers(item: CartItem) {
    if (item.type !== 'gene') return;
    const disease = this.selectedDisease();
    if (!disease) return;
    this.loadingModuleMembers.set(item.id);
    try {
      await this.cartService.addModuleMembersForGene(item.entity as Gene, disease.disease_name, 'gene');
    } finally {
      this.loadingModuleMembers.set(null);
    }
  }

  async addTranscripts(item: CartItem) {
    if (item.type !== 'gene') return;
    this.loadingTranscripts.set(item.id);
    try {
      await this.cartService.addTranscriptsOfGene(item.entity as Gene);
    } finally {
      this.loadingTranscripts.set(null);
    }
  }

  async visualizeNetwork() {
    const disease = this.selectedDisease();
    if (!disease || this.items().length === 0) return;
    this.dialog.open(CartNetworkDialogComponent, {
      data: { items: this.items(), disease },
      minWidth: '80vw',
      minHeight: '70vh',
    });
  }
}
