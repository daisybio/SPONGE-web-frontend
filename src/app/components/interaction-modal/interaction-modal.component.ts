import {Component, computed, inject, resource} from '@angular/core';
import {GeneInteraction, TranscriptInteraction} from "../../interfaces";
import {MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {BackendService} from "../../services/backend.service";
import {VersionsService} from "../../services/versions.service";
import {BrowseService} from "../../services/browse.service";
import {MatProgressSpinner} from "@angular/material/progress-spinner";

@Component({
  selector: 'app-interaction-modal',
  imports: [MatDialogModule, MatProgressSpinner],
  templateUrl: './interaction-modal.component.html',
  styleUrl: './interaction-modal.component.scss'
})
export class InteractionModalComponent {
  readonly interaction = inject<GeneInteraction | TranscriptInteraction>(MAT_DIALOG_DATA);
  protected readonly browseService = inject(BrowseService);
  disease$ = this.browseService.disease$;
  protected readonly BrowseService = BrowseService;
  private readonly backend = inject(BackendService);
  miRNAresource = resource({
    request: computed(() => {
      return {
        version: this.version$(),
        level: 'gene' in this.interaction ? 'gene' : 'transcript',
        disease: this.disease$()
      }
    }),
    loader: async (param) => {
      const disease = param.request.disease;
      if (disease === undefined) return;
      const identifiers = BrowseService.getInteractionIDs(this.interaction);
      return await this.backend.getMiRNAs(param.request.version, disease, identifiers, param.request.level as 'gene' | 'transcript');
    }
  })
  private readonly versionsService = inject(VersionsService);
  version$ = this.versionsService.versionReadOnly();
}
