import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { BackendService } from "./backend.service";
import { VersionsService } from "./versions.service";
import { SpongEffectsRun, Dataset, SpongEffectsGeneModuleMembers, SpongEffectsTranscriptModuleMembers } from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class SpongEffectsService {
  backend = inject(BackendService);
  versionsService = inject(VersionsService);
  private readonly _version$ = this.versionsService.versionReadOnly();

  readonly selectedMode$ = signal<'explore' | 'predict' | 'enrichment'>('enrichment');

  spongEffectsRuns$ = resource({
    params: this._version$,
    loader: async (version) => {
      return await this.backend.getSpongEffectsRuns(version.params);
    }
  });

  datasets$ = computed(() => {
    const runs = this.spongEffectsRuns$.value() || [];
    const allDatasets = this.versionsService.diseases$().value() || [];
    const datasets = runs.map((run: SpongEffectsRun) => {
      const match = allDatasets.find(d => d.dataset_ID === run.dataset_ID);
      return {
        dataset_ID: run.dataset_ID,
        disease_name: run.disease_name,
        data_origin: run.data_origin,
        disease_subtype: run.disease_subtype,
        disease_type: run.disease_type,
        download_url: run.download_url,
        sponge_db_version: run.sponge_db_version,
        sample_count: match?.sample_count || 0
      } as Dataset;
    });
    return datasets.filter((dataset, index, self) =>
      index === self.findIndex((d) => d.dataset_ID === dataset.dataset_ID)
    );
  });

  // diseaseNames$ = linkedSignal(() => this.datasets$().map(d => d.disease_name));
  diseaseNames$ = computed(() => {
    const runs = this.spongEffectsRuns$.value() || [];
    return runs.map((run: SpongEffectsRun) => run.disease_name)
      .filter((value: string, index: number, self: Array<string>) => self.indexOf(value) === index);
  });

  // ---- Shared, cached module-member access ----------------------------------------------
  // Module members for a given (disease, module) are needed by several tabs/components — the
  // network, the module tables, the importance plot, the cart. Route them all through these
  // cached accessors so the same module is fetched from the backend at most once per
  // (version, disease, identifier, limit), deduplicating across components and tab switches.
  private readonly geneMembersCache = new Map<string, SpongEffectsGeneModuleMembers[]>();
  private readonly transcriptMembersCache = new Map<string, SpongEffectsTranscriptModuleMembers[]>();

  async getGeneModuleMembers(
    version: number,
    disease: string,
    opts: { ensemblID?: string; moduleId?: number; limit?: number } = {}
  ): Promise<SpongEffectsGeneModuleMembers[]> {
    const key = `${version}|${disease}|${opts.ensemblID ?? ''}|${opts.moduleId ?? ''}|${opts.limit ?? ''}`;
    let cached = this.geneMembersCache.get(key);
    if (!cached) {
      cached = (await this.backend.getSpongEffectsGeneModuleMembers(
        version, disease, opts.ensemblID, undefined, opts.limit, opts.moduleId
      )) ?? [];
      this.geneMembersCache.set(key, cached);
    }
    return cached;
  }

  async getTranscriptModuleMembers(
    version: number,
    disease: string,
    opts: { ensemblID?: string; moduleId?: number; limit?: number } = {}
  ): Promise<SpongEffectsTranscriptModuleMembers[]> {
    const key = `${version}|${disease}|${opts.ensemblID ?? ''}|${opts.moduleId ?? ''}|${opts.limit ?? ''}`;
    let cached = this.transcriptMembersCache.get(key);
    if (!cached) {
      cached = (await this.backend.getSpongEffectsTranscriptModuleMembers(
        version, disease, opts.ensemblID, undefined, opts.limit, opts.moduleId
      )) ?? [];
      this.transcriptMembersCache.set(key, cached);
    }
    return cached;
  }
}
