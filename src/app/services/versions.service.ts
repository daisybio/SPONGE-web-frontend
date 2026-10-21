import { Injectable, resource, ResourceRef, signal, effect } from '@angular/core';
import { BackendService } from './backend.service';
import { Dataset } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class VersionsService {
  version$ = signal(2);
  readonly selectedDiseaseName$ = signal<string | undefined>(undefined);
  private readonly _diseases$: ResourceRef<Dataset[] | undefined>;

  constructor(backendService: BackendService) {
    this._diseases$ = resource({
      params: this.version$,
      loader: async (version) =>
        (await backendService.getDatasets(version.params)).filter(
          (dataset) => dataset.sponge_db_version === version.params,
        ),
    });

    // Automatically sync chosen disease name when dataset list changes
    effect(() => {
      const diseases = this._diseases$.value();
      const current = this.selectedDiseaseName$();
      if (diseases && diseases.length > 0) {
        if (!current || !diseases.some((d) => d?.disease_name?.toLowerCase() === current?.toLowerCase())) {
          this.selectedDiseaseName$.set(diseases[0].disease_name);
        }
      } else {
        this.selectedDiseaseName$.set(undefined);
      }
    });
  }

  versionReadOnly() {
    return this.version$.asReadonly();
  }

  diseases$() {
    return this._diseases$.asReadonly();
  }
}
