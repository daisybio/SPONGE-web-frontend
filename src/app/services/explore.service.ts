import {computed, Injectable, resource, ResourceRef, Signal, signal} from '@angular/core';
import {BackendService} from './backend.service';
import {ExploreQuery, SpongEffectsRun} from '../interfaces';
import {VersionsService} from './versions.service';

interface ExploreSelection {
  selectedCancer: string;
  selectedLevel: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExploreService {
  private readonly _spongEffectsRuns$: ResourceRef<SpongEffectsRun[]>;
  private readonly _spongEffectsRunDatasets$: Signal<string[]>;
  private readonly _version$: Signal<number>;
  private readonly _query$ = signal<ExploreQuery | undefined>(undefined);
  private readonly _currentData$: ResourceRef<ExploreSelection>;
  readonly cancer$ = computed(() => this._currentData$.value()?.selectedCancer);


  constructor(private backend: BackendService, versionsService: VersionsService) {
    this._version$ = versionsService.versionReadOnly();

    this._spongEffectsRuns$ = resource({
      request: this._version$,
      loader: async (version) => (
        await backend.getSpongEffectsRuns(version.request)
      )
    });

    this._spongEffectsRunDatasets$ = computed(() => {
        const runs = this._spongEffectsRuns$.value() || [];
        return [...new Set(runs.map((run: SpongEffectsRun) => run.disease_name))];
      }
    );

    const requestData = computed(() => {
      return {
        version: this._version$(),
        config: this._query$()
      }
    });

    this._currentData$ = resource({
      request: requestData,
      loader: (param) => this.fetchData(param.request.version, param.request.config),
    })
  }

  runQuery(query: ExploreQuery) {
    this._query$.set(query);
  }

  async fetchData(version: number, config: ExploreQuery | undefined): Promise<ExploreSelection> {
    if (config === undefined) {
      return {
        selectedCancer: "",

        selectedLevel: ""
      }
    }


    return {
      selectedCancer: config.selectedCancer,
      selectedLevel: config.selectedLevel
    }
  }

  spongEffectsRunDataset() {
    return this._spongEffectsRunDatasets$;
  }


}





