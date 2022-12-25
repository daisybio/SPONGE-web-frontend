import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SharedService {
  data: Object;

  constructor() {}

  public setData(data) {
    this.data = data;
  }

  public getData() {
    return this.data;
  }
}
