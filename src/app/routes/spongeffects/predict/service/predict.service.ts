import { computed, effect, inject, Injectable, Resource, resource, ResourceRef, signal } from '@angular/core';
import { BackendService } from '../../../../services/backend.service';
import { PredictCancerType } from '../../../../interfaces';
import { EXAMPLE_PREDICTION_URL } from '../../../../constants';

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
  _subtypes$ = signal<boolean>(false);

  examplePrediction = (async () => {
    const response = await fetch(EXAMPLE_PREDICTION_URL);
    return await response.json();
  })();

  readonly _prediction$ = resource({
    request: computed(() => {
      return {
        query: this._query$(),
        example: this.examplePrediction,
    }},
  ),
    loader: async (param) => {
      const query = param.request.query;
      if (!query) {
        const example =  await this.examplePrediction
        console.log('resource service')
        return example
        // || {
        //   meta: {
        //     runtime: 0,
        //     level: '',
        //     n_samples: 0,
        //     type_predict: '',
        //     subtype_predict: '',
        //   },
        //   data: [],
        // });
      }
      return await this.backend.predictCancerType(
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

  public get isLoading$() {
    return this._prediction$.isLoading;
  }

  public get prediction$() {
    return this._prediction$.value.asReadonly();
  }

  request(query: Query) {
    console.log('request');
    this._query$.set(query);
  }
}
