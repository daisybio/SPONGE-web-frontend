import { Injectable, resource, ResourceRef, signal } from '@angular/core';
import { BackendService } from './backend.service';
import { Dataset } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class VersionsService {
  version$ = signal(2);
  private readonly _diseases$: ResourceRef<Dataset[] | undefined>;

  constructor(backendService: BackendService) {
    this._diseases$ = resource({
      request: this.version$,
      loader: async (version) =>
        (await backendService.getDatasets(version.request)).filter(
          (dataset) => dataset.sponge_db_version === version.request,
        ),
    });
  }

  versionReadOnly() {
    return this.version$.asReadonly();
  }

  diseases$() {
    return this._diseases$.asReadonly();
  }
}
