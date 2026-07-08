import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Gene, Transcript } from '../interfaces';
import { BackendService } from './backend.service';
import { VersionsService } from './versions.service';

export interface CartItem {
  type: 'gene' | 'transcript';
  entity: Gene | Transcript;
  /** Display label */
  label: string;
  /** Primary ID used for deduplication */
  id: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private backend = inject(BackendService);
  private versionsService = inject(VersionsService);

  readonly items: WritableSignal<CartItem[]> = signal([]);
  readonly count = computed(() => this.items().length);

  add(entity: Gene | Transcript): void {
    const item = this.toCartItem(entity);
    if (!item) return;
    this.items.update(current => {
      if (current.find(c => c.id === item.id)) return current;
      return [...current, item];
    });
  }

  remove(id: string): void {
    this.items.update(current => current.filter(c => c.id !== id));
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
      for (const enst of transcripts) {
        const transcriptEntity: Transcript = { enst_number: enst, gene };
        this.add(transcriptEntity);
      }
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
      if (level === 'gene') {
        const modules = await this.backend.getSpongEffectsGeneModules(version, disease, undefined, undefined, gene.ensg_number);
        for (const mod of modules) {
          const members = await this.backend.getSpongEffectsGeneModuleMembers(version, disease, gene.ensg_number, undefined, 100, mod.spongEffects_gene_module_ID);
          for (const m of members) {
            this.add(m.gene as Gene);
          }
        }
      } else {
        // Transcripts
        const modules = await this.backend.getSpongEffectsTranscriptModules(version, disease, undefined, undefined, gene.ensg_number);
        for (const mod of modules) {
          const members = await this.backend.getSpongEffectsTranscriptModuleMembers(version, disease, gene.ensg_number, undefined, 100, mod.spongEffects_transcript_module_ID);
          for (const m of members) {
            this.add(m.transcript as Transcript);
          }
        }
      }
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

  /** Convert entity to CartItem */
  private toCartItem(entity: Gene | Transcript): CartItem | null {
    if ('ensg_number' in entity) {
      return {
        type: 'gene',
        entity,
        label: entity.gene_symbol || entity.ensg_number,
        id: entity.ensg_number,
      };
    } else if ('enst_number' in entity) {
      const t = entity as Transcript;
      return {
        type: 'transcript',
        entity,
        label: `${t.gene?.gene_symbol ?? ''} (${t.enst_number})`,
        id: t.enst_number,
      };
    }
    return null;
  }
}
