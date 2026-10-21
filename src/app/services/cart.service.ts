import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Gene, GeneInteraction, Transcript, TranscriptInteraction } from '../interfaces';
import { BackendService } from './backend.service';
import { VersionsService } from './versions.service';
import { SpongEffectsService } from './spong-effects.service';

export type CartEntity = Gene | Transcript | GeneInteraction | TranscriptInteraction;

export interface CartItem {
  type: 'gene' | 'transcript' | 'interaction';
  entity: CartEntity;
  /** Display label */
  label: string;
  /** Primary ID used for deduplication: ENSG, ENST, or the sorted endpoint pair of an interaction */
  id: string;
}

/**
 * The cart is the only selection state of the app: every network highlights the cart items it
 * contains (see BrowseService.nodeStates$ / edgeStates$), so it survives filter, level and page changes.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);
  private spongEffectsService = inject(SpongEffectsService);

  /** Newest first */
  readonly items: WritableSignal<CartItem[]> = signal([]);
  readonly count = computed(() => this.items().length);
  readonly ids = computed(() => new Set(this.items().map(c => c.id)));

  /** Interactions are identified by their endpoint pair, independent of direction. */
  static interactionId(id1: string, id2: string): string {
    return [id1, id2].sort().join('|');
  }

  static idOf(entity: CartEntity): string | undefined {
    return CartService.toCartItem(entity)?.id;
  }

  has(id: string): boolean {
    return this.ids().has(id);
  }

  add(entity: CartEntity): void {
    this.addMany([entity]);
  }

  /** Adds entities at the top of the cart, keeping their order and skipping ones already in it. */
  addMany(entities: CartEntity[]): void {
    this.items.update(current => {
      const seen = new Set(current.map(c => c.id));
      const added: CartItem[] = [];
      for (const entity of entities) {
        const item = CartService.toCartItem(entity);
        if (!item || seen.has(item.id)) continue;
        seen.add(item.id);
        added.push(item);
      }
      return added.length > 0 ? [...added, ...current] : current;
    });
  }

  toggle(entity: CartEntity): void {
    const id = CartService.idOf(entity);
    if (id === undefined) return;
    if (this.has(id)) {
      this.remove(id);
    } else {
      this.add(entity);
    }
  }

  remove(id: string): void {
    this.removeMany([id]);
  }

  removeMany(ids: Iterable<string>): void {
    const toRemove = new Set(ids);
    this.items.update(current => current.filter(c => !toRemove.has(c.id)));
  }

  clear(): void {
    this.items.set([]);
  }

  /**
   * Fetch all transcripts of a gene and add them to the cart.
   */
  async addTranscriptsOfGene(gene: Gene): Promise<void> {
    const version = this.versionsService.versionReadOnly()();
    if (!version) return;
    try {
      const transcripts = await this.backend.getGeneTranscripts(version, gene.ensg_number);
      this.addMany(transcripts.map(enst => ({ enst_number: enst, gene } as Transcript)));
    } catch (e) {
      console.error('CartService: error fetching transcripts', e);
    }
  }

  /**
   * Fetch module members of a gene (from SpongEffects gene modules) and add to cart.
   */
  async addModuleMembersForGene(gene: Gene, disease: string, level: 'gene' | 'transcript'): Promise<void> {
    const version = this.versionsService.versionReadOnly()();
    if (!version || !disease) return;
    try {
      const entities: (Gene | Transcript)[] = [];
      if (level === 'gene') {
        const modules = await this.backend.getSpongEffectsGeneModules(version, disease, undefined, undefined, gene.ensg_number);
        for (const mod of modules) {
          const members = await this.spongEffectsService.getGeneModuleMembers(version, disease, { ensemblID: gene.ensg_number, moduleId: mod.spongEffects_gene_module_ID });
          entities.push(...members.map(m => m.gene as Gene));
        }
      } else {
        // Transcripts
        const modules = await this.backend.getSpongEffectsTranscriptModules(version, disease, undefined, undefined, gene.ensg_number);
        for (const mod of modules) {
          const members = await this.spongEffectsService.getTranscriptModuleMembers(version, disease, { ensemblID: gene.ensg_number, moduleId: mod.spongEffects_transcript_module_ID });
          entities.push(...members.map(m => m.transcript as Transcript));
        }
      }
      this.addMany(entities);
    } catch (e) {
      console.error('CartService: error fetching module members', e);
    }
  }

  /**
   * Search by gene symbol and add matching gene to cart.
   */
  async addBySearch(query: string): Promise<Gene | null> {
    const version = this.versionsService.versionReadOnly()();
    if (!version || !query.trim()) return null;
    try {
      const results = await this.backend.getAutocomplete(version, query.trim());
      if (results?.length > 0) {
        const gene: Gene = { ensg_number: results[0].ensg_number, gene_symbol: results[0].gene_symbol };
        this.add(gene);
        return gene;
      }
      return null;
    } catch (e) {
      console.error('CartService: error searching gene', e);
      return null;
    }
  }

  /** Convert entity to CartItem. Interactions are checked first: they carry no top-level ENSG/ENST. */
  private static toCartItem(entity: CartEntity): CartItem | null {
    if ('gene1' in entity) {
      const [a, b] = [entity.gene1, entity.gene2];
      return {
        type: 'interaction',
        entity,
        label: `${a.gene_symbol || a.ensg_number} – ${b.gene_symbol || b.ensg_number}`,
        id: CartService.interactionId(a.ensg_number, b.ensg_number),
      };
    } else if ('transcript_1' in entity) {
      const [a, b] = [entity.transcript_1, entity.transcript_2];
      return {
        type: 'interaction',
        entity,
        label: `${CartService.transcriptLabel(a)} – ${CartService.transcriptLabel(b)}`,
        id: CartService.interactionId(a.enst_number, b.enst_number),
      };
    } else if ('ensg_number' in entity) {
      return {
        type: 'gene',
        entity,
        label: entity.gene_symbol || entity.ensg_number,
        id: entity.ensg_number,
      };
    } else if ('enst_number' in entity) {
      return {
        type: 'transcript',
        entity,
        label: CartService.transcriptLabel(entity),
        id: entity.enst_number,
      };
    }
    return null;
  }

  private static transcriptLabel(t: Transcript): string {
    return `${t.gene?.gene_symbol ?? ''} (${t.enst_number})`;
  }
}
