import {Injectable, Signal, signal, computed, ResourceRef, resource, effect} from '@angular/core';
import { BackendService } from './backend.service';
import { Cancer } from '../routes/spongeffects/explore/explore.component';
import { SpongEffectsRun, Dataset } from '../interfaces';
import { VersionsService } from './versions.service';
import { ExploreQuery } from '../interfaces';

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
  readonly level$ = computed(() => this._currentData$.value()?.selectedLevel);
  
  
  

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

    effect(() => {
      // const graph = this.graph$();
      // const initialState: EntityState = {[State.Hover]: false, [State.Active]: false};
      // this._nodeStates$.set(Object.fromEntries(graph.nodes().map(node => [node, initialState])));
      // this._edgeStates$.set(Object.fromEntries(graph.edges().map(edge => [edge, initialState])));
    });

  }

  runQuery(query: ExploreQuery) {
    this._query$.set(query);
  }

  async fetchData(version: number, config: ExploreQuery | undefined): Promise<ExploreSelection> {
      if (config === undefined) {
        return {
          selectedCancer: "",
          // selectedCancer: {
          //   dataset_ID: 0,
          //   disease_name: "",
          //   disease_subtype: "",
          //   data_origin: "",
          //   disease_type: "",
          //   download_url: "",
          //   sponge_db_version: 0
          // },
          selectedLevel: ""
        }
      }
  
      // const nodes = await this.backend.getNodes(version, config);
      // Get gene IDs or transcript IDs respectively
      // const identifiers = nodes.map(node => 'gene' in node ? node.gene.ensg_number : node.transcript.enst_number);
      // const interactions =
      //   await this.backend.getInteractionsSpecific(version, config.dataset, config.maxPValue, identifiers, config.level);
  
      return {
        selectedCancer: config.selectedCancer,
        selectedLevel: config.selectedLevel
      }
    }

  spongEffectsRunDataset() {
    return this._spongEffectsRunDatasets$;
  }

  // private initCancerInfo() {
  //   // const spongEffectsCancerAbbreviations: string[] = ['BRCA', 'CESC', 'ESCA', 'HNSC', 'LGG', 'SARC', 'STAD', 'TGCT', 'UCEC'];

  //   // get cancer information from backend: for each sponge_run get dataset information
  //   let datasets = this.backend.getDatasets(this._version$());
  //   console.log(datasets);
  //   // save all datasets that have a spongEffectsRun in 'cancers'
  //   console.log("before", datasets.then(cancers => cancers.map(cancer => cancer.disease_name)));
  //   let cancers = datasets.then(datasets => datasets.filter(dataset => dataset.dataset_ID in this.spongEffectsRuns.then(spongEffectsRuns => spongEffectsRuns.map(spongEffectsRun => spongEffectsRun.dataset_ID))));
  //   console.log("here", cancers.then(cancers => cancers.map(cancer => cancer.disease_name)));
  //   return cancers
  // }


    
}





