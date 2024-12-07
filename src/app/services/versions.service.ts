import {Injectable, resource, ResourceRef, signal} from '@angular/core';
import {BackendService} from "./backend.service";
import {Dataset} from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class VersionsService {
  version$ = signal(2);
  private readonly _diseases$: ResourceRef<Dataset[]>;

  constructor(backendService: BackendService) {
    this._diseases$ = resource({
      request: this.version$,
      loader: (param) => backendService.getDatasets(param.request)
    });
  }

  versionReadOnly() {
    return this.version$.asReadonly();
  }

  diseases$() {
    return this._diseases$.asReadonly();
  }
}
