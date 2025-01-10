import { inject, Injectable, resource, signal } from '@angular/core';
import { BackendService } from '../../../../services/backend.service';

export interface Query {
  file: File;
  mscor: number;
  fdr: number;
  minSize: number;
  maxSize: number;
  minExpr: number;
  method: string;
  logScaling: boolean;
  predictSubtypes: boolean;
  version: number;
}

@Injectable({
  providedIn: 'root',
})
export class PredictService {
  backend = inject(BackendService);
  private readonly _query$ = signal<Query | undefined>(undefined);

  prediction$ = resource({
    request: this._query$,
    loader: (param) => {
      const query = param.request;
      if (!query) {
        return Promise.resolve({
          meta: {
            runtime: 0,
            level: '',
            n_samples: 0,
            type_predict: '',
            subtype_predict: '',
          },
          data: [],
        });
      }
      return this.backend.predictCancerType(
        query.version,
        query.file,
        query.predictSubtypes,
        query.logScaling,
        query.mscor,
        query.fdr,
        query.minSize,
        query.maxSize,
        query.minExpr,
        query.method,
      );
    },
  });

  constructor() {}

  public get isLoading$() {
    return this.prediction$.isLoading;
  }

  request(query: Query) {
    this._query$.set(query);
  }
}
