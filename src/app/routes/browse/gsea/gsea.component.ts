import {Component, computed, inject, resource, signal} from '@angular/core';
import {VersionsService} from "../../../services/versions.service";
import {BrowseService} from "../../../services/browse.service";
import {BackendService} from "../../../services/backend.service";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {Dataset} from "../../../interfaces";
import {DiseaseSelectorComponent} from "../../../components/disease-selector/disease-selector.component";

@Component({
  selector: 'app-gsea',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    DiseaseSelectorComponent
  ],
  templateUrl: './gsea.component.html',
  styleUrl: './gsea.component.scss'
})
export class GSEAComponent {
  versionsService = inject(VersionsService);
  browseService = inject(BrowseService);
  backend = inject(BackendService);


  globalDisease$ = this.browseService.disease$;
  localDisease$ = signal<Dataset | undefined>(undefined);

  geneSets$ = resource({
    request: computed(() => {
      return {
        global: this.globalDisease$(),
        local: this.localDisease$(),
        version: this.versionsService.versionReadOnly()()
      }
    }),
    loader: request => {
      return this.backend.getGeneSets(request.request.version, request.request.global, request.request.local);
    }
  })
}
