import {Injectable, Signal, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrowseService {
  constructor() {
  }

  private _isLoading$ = signal<boolean>(false);

  get isLoading$(): Signal<boolean> {
    return this._isLoading$.asReadonly();
  }

  async runQuery(config: any) {
    this._isLoading$.set(true);

    // Run query here

    this._isLoading$.set(false);
  }
}
