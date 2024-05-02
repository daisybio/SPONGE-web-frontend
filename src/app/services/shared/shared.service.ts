import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

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

  private _selectedEdgeMirnas = new Subject<string[]>();

  public get selectedEdgeMirnas$() {
    return this._selectedEdgeMirnas.asObservable();
  }
  // push selected mirnas to other components; triggers update of IGV
  public pushMirnas(mirnas: string[]) {
    this._selectedEdgeMirnas.next(mirnas);
  }

}
