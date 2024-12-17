import {computed, Injectable, resource, ResourceRef, Signal, signal} from '@angular/core';
import {BackendService} from "./backend.service";
import {Dataset} from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class VersionsService {
  version$ = signal(2);
  private readonly _diseases$: ResourceRef<Dataset[]>;
  private readonly _diseaseSubtypeMap$: Signal<Map<string, Dataset[]>>;

  constructor(backendService: BackendService) {
    this._diseases$ = resource({
      request: this.version$,
      loader: async (version) => (
        await backendService.getDatasets(version.request)
      ).filter(dataset => dataset.sponge_db_version === version.request)
    });

    this._diseaseSubtypeMap$ = computed(() => {
      const diseaseSubtypes = new Map<string, Dataset[]>();
      (this._diseases$.value() || []).forEach(disease => {
        const diseaseName = disease.disease_name;
        if (!diseaseSubtypes.has(diseaseName)) {
          diseaseSubtypes.set(diseaseName, []);
        }
        diseaseSubtypes.get(diseaseName)?.push(disease);
      });
      return diseaseSubtypes;
    });
  }

  versionReadOnly() {
    return this.version$.asReadonly();
  }

  diseases$() {
    return this._diseases$.asReadonly();
  }

  diseaseSubtypeMap() {
    return this._diseaseSubtypeMap$;
  }
}
