import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VersionsService {
  version$ = signal(2);

  versionReadOnly() {
    return this.version$.asReadonly();
  }
}
