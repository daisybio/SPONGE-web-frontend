import {Injectable, signal, WritableSignal} from '@angular/core';

@Injectable({
    providedIn: 'root'
  })
  export class VersionService {
    private static LATEST: number = 2;
    private currentVersion: WritableSignal<number> = signal(VersionService.LATEST);

    constructor(private version: VersionService) {
    }

    public getCurrentVersion(): WritableSignal<number> {
        return this.version.currentVersion;
    }

    public setCurrentVersion(new_version: number): void {
        this.version.currentVersion = signal(new_version);
    }

    public resetToDefault(): void {
        this.currentVersion = signal(VersionService.LATEST)
    }
}
