import { computed, effect, inject, Injectable, Resource, resource, ResourceRef, Signal, signal, WritableSignal } from '@angular/core';
import { BackendService } from '../../../../services/backend.service';
import { PredictCancerType } from '../../../../interfaces';
import { EXAMPLE_PREDICTION_URL } from '../../../../constants';
import { compute } from '@fullstax/kaplan-meier-estimator';

export interface Query {
  useExampleExpression: boolean;
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
  example_used = signal<boolean>(false);
  level: 'gene' | 'transcript' = 'gene';

  allPredictedTypes$: Signal<string[]> = computed(() => {
    if (!this.prediction$()) return [];
    const data = this.prediction$().data;
    if (!data) return [];
    return Array.from(
      new Set(data.map((entry: { typePrediction: string }) => entry.typePrediction)),
    );
  });
  selectedPredictedType$ = computed(() => {
    const prediction = this._prediction$.value();
    if (!prediction || !prediction.meta) return undefined;
    return prediction.meta.type_predict || undefined;
  });

  examplePrediction = (async () => {
    const response = await fetch(EXAMPLE_PREDICTION_URL);
    const prediction = await response.json();
    return prediction;
  })();

  readonly _prediction$: ResourceRef<PredictCancerType> = resource({
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
        this.example_used.set(true);
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
      if (!query.useExampleExpression) {
        this.example_used.set(false)
      }
      const prediction = await this.backend.predictCancerType(
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
      return prediction;
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
