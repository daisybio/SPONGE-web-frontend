import {Injectable, Signal, signal} from '@angular/core';
import {CeRNA, CeRNAInteraction, CeRNAQuery, Dataset} from "../interfaces";
import {BackendService} from "./backend.service";

export interface BrowseState {
  disease: Dataset;
  ceRNAs: CeRNA[];
  interactions: CeRNAInteraction[];
}

@Injectable({
  providedIn: 'root'
})
export class BrowseService {
  private readonly _data$ = signal<BrowseState | undefined>(undefined);

  constructor(private backend: BackendService) {
  }

  get data$(): Signal<BrowseState | undefined> {
    return this._data$.asReadonly();
  }

  private _isLoading$ = signal<boolean>(false);

  get isLoading$(): Signal<boolean> {
    return this._isLoading$.asReadonly();
  }

  async runQuery(config: CeRNAQuery) {
    this._isLoading$.set(true);

    const ceRNA$ = this.backend.getCeRNA(config);
    const runInfo$ = this.backend.getDatasetInfo(config.disease.disease_name);
    const ensgs$ = ceRNA$.then(ceRNAs => ceRNAs.map(ceRNA => ceRNA.gene.ensg_number));
    const interactions$ = ensgs$.then(async (ensgs) => await this.backend.getCeRNAInteractions(config, ensgs));

    const [ceRNAs, runInfo, interactions] = await Promise.all([ceRNA$, runInfo$, interactions$]);

    this._data$.set({ceRNAs, interactions, disease: config.disease});
    this._isLoading$.set(false);
  }
}
