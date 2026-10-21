import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { BrowseService } from '../../services/browse.service';
import { CartItem, CartService } from '../../services/cart.service';
import { BackendService } from '../../services/backend.service';
import { VersionsService } from '../../services/versions.service';
import { ModalsService } from '../modals-service/modals.service';
import { InfoComponent } from '../info/info.component';
import { CartNetworkDialogComponent } from './cart-network-dialog.component';
import {
  Gene,
  GeneInteraction,
  GeneNode,
  Transcript,
  TranscriptInteraction,
  TranscriptNode,
  Dataset,
} from '../../interfaces';

/**
 * The gene cart, shown as the right-hand column of every page that interacts with it. The cart is
 * also the network selection (see CartService), so on pages with a network the items that network
 * contains are shown with its metrics, and the rest are listed under "Not in this network".
 */
@Component({
  selector: 'app-cart-column',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    InfoComponent,
  ],
  templateUrl: './cart-column.component.html',
  styleUrl: './cart-column.component.scss',
  host: { '[class.disabled]': 'disabled()' },
})
export class CartColumnComponent {
  protected readonly BrowseService = BrowseService;
  private readonly cartService = inject(CartService);
  private readonly modalsService = inject(ModalsService);
  private readonly backend = inject(BackendService);
  private readonly versionsService = inject(VersionsService);
  private readonly dialog = inject(MatDialog);

  /** The page's network. Without one (Genes page) items are listed without network metrics. */
  browseService = input<BrowseService>();
  /** Disease for pages without a network */
  disease = input<Dataset>();
  /** Greyed out on tabs that don't interact with the cart */
  disabled = input(false);

  readonly count = this.cartService.count;
  readonly effectiveDisease = computed(() => this.browseService()?.disease$() ?? this.disease());
  protected readonly activeTabIndex = signal(0);

  // Newest first, as in the cart
  readonly entityItems = computed(() => this.cartService.items().filter((item) => item.type !== 'interaction'));
  readonly interactionItems = computed(() => this.cartService.items().filter((item) => item.type === 'interaction'));

  private readonly networkNodesByID = computed(() => {
    const nodes = this.browseService()?.activeNodes$() ?? [];
    return new Map(nodes.map((node) => [BrowseService.getNodeID(node), node]));
  });
  /** The page network's interaction for each cart pair (the first one if there are several) */
  private readonly networkInteractionsByID = computed(() => {
    const byID = new Map<string, GeneInteraction | TranscriptInteraction>();
    for (const interaction of this.browseService()?.activeInteractions$() ?? []) {
      const id = CartService.interactionId(...BrowseService.getInteractionIDs(interaction));
      if (!byID.has(id)) byID.set(id, interaction);
    }
    return byID;
  });

  readonly nodesInNetwork = computed(() =>
    this.entityItems().flatMap((item) => this.networkNodesByID().get(item.id) ?? [])
  );
  readonly entitiesNotInNetwork = computed(() =>
    this.entityItems().filter((item) => !this.networkNodesByID().has(item.id))
  );
  readonly interactionsInNetwork = computed(() =>
    this.interactionItems().flatMap((item) => this.networkInteractionsByID().get(item.id) ?? [])
  );
  readonly interactionsNotInNetwork = computed(() =>
    this.interactionItems().filter((item) => !this.networkInteractionsByID().has(item.id))
  );
  protected readonly showNotInNetwork = signal(true);

  readonly gProfilerUrl = computed(() =>
    BrowseService.getGProfilerUrlForGenes(
      this.entityItems().map((item) =>
        item.type === 'gene' ? (item.entity as Gene) : (item.entity as Transcript).gene
      )
    )
  );

  readonly searchQuery = signal('');
  readonly searchResults = signal<Gene[]>([]);
  readonly isSearching = signal(false);
  readonly loadingModuleMembers = signal<string | null>(null);
  readonly loadingTranscripts = signal<string | null>(null);

  constructor() {
    // Show the tab of whatever was clicked last in the network
    effect(() => {
      const network = this.browseService();
      if (network) {
        this.activeTabIndex.set(network.lastClicked() === 'node' ? 0 : 1);
      }
    });
  }

  isVirtualEdge(interaction: GeneInteraction | TranscriptInteraction): boolean {
    const int = interaction as any;
    return !!(
      int.isVirtual ||
      int.mscor === '< 0.2' ||
      int.mscor === '<0.1' ||
      int.p_value === '> 0.2' ||
      int.sponge_run?.sponge_run_ID === 0
    );
  }

  hasMetrics(node: GeneNode | TranscriptNode): boolean {
    return (
      node.betweenness !== null && node.betweenness !== undefined &&
      node.node_degree !== null && node.node_degree !== undefined
    );
  }

  /** The gene of a gene node, for the module-member and transcript actions */
  nodeGene(node: GeneNode | TranscriptNode): Gene | undefined {
    return 'gene' in node ? node.gene : undefined;
  }

  itemGene(item: CartItem): Gene | undefined {
    return item.type === 'gene' ? (item.entity as Gene) : undefined;
  }

  openNode(node: GeneNode | TranscriptNode): void {
    this.modalsService.openNodeDialog(node);
  }

  openEntity(entity: unknown): void {
    this.modalsService.openNodeDialog(entity, this.effectiveDisease());
  }

  openInteraction(interaction: unknown): void {
    this.modalsService.openMiRNADialog(
      interaction as GeneInteraction | TranscriptInteraction,
      this.effectiveDisease()
    );
  }

  remove(id: string): void {
    this.cartService.remove(id);
  }

  removeNode(node: GeneNode | TranscriptNode): void {
    this.cartService.remove(BrowseService.getNodeID(node));
  }

  removeInteraction(interaction: GeneInteraction | TranscriptInteraction): void {
    this.cartService.remove(CartService.interactionId(...BrowseService.getInteractionIDs(interaction)));
  }

  clearAll(): void {
    this.cartService.clear();
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

  async addModuleMembers(gene: Gene) {
    const disease = this.effectiveDisease();
    if (!disease) return;
    this.loadingModuleMembers.set(gene.ensg_number);
    try {
      await this.cartService.addModuleMembersForGene(gene, disease.disease_name, 'gene');
    } finally {
      this.loadingModuleMembers.set(null);
    }
  }

  async addTranscripts(gene: Gene) {
    this.loadingTranscripts.set(gene.ensg_number);
    try {
      await this.cartService.addTranscriptsOfGene(gene);
    } finally {
      this.loadingTranscripts.set(null);
    }
  }

  visualizeNetwork() {
    const disease = this.effectiveDisease();
    if (!disease || this.count() === 0) return;
    this.dialog.open(CartNetworkDialogComponent, {
      data: { items: this.cartService.items(), disease },
      minWidth: '80vw',
      minHeight: '70vh',
    });
  }
}
