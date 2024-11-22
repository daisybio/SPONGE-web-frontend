import {Injectable, Signal, signal} from '@angular/core';
import {CeRNAQuery} from "../interfaces";
import {BackendService} from "./backend.service";

@Injectable({
  providedIn: 'root'
})
export class BrowseService {
  constructor(private backend: BackendService) {
  }

  private _isLoading$ = signal<boolean>(false);

  get isLoading$(): Signal<boolean> {
    return this._isLoading$.asReadonly();
  }

  async runQuery(config: CeRNAQuery) {
    this._isLoading$.set(true);

    const resp$ = this.backend.getCeRNA(config);
    const runInfo$ = this.backend.getDatasetInfo(config.disease.disease_name);
    const ensgs$ = resp$.then(resp => resp.map(cerna => cerna.gene.ensg_number));
    const interactions$ = ensgs$.then(async (ensgs) => await this.backend.getCeRNAInteractions(config, ensgs));


    const [resp, runInfo, interactions] = await Promise.all([resp$, runInfo$, interactions$]);
    console.log('ceRNA response:', resp);
    console.log('run info:', runInfo);
    console.log('interactions:', interactions);

    this._isLoading$.set(false);
  }
}
