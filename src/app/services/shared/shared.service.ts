import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IGVInput } from 'src/app/interfaces';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  constructor() { }

  private data: Object;
  public setData(data) {
    this.data = data;
  }
  public getData() {
    return this.data;
  }

  private _igvInput = new Subject<IGVInput>();

  public get igvInput$() {
    return this._igvInput.asObservable();
  }
  // push selected mirnas to other components; triggers update of IGV
  public pushIgvInput(igvInput: IGVInput) {
    this._igvInput.next(igvInput);
  }

}
