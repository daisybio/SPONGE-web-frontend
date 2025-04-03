import { Component, computed, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowseService } from '../../../services/browse.service';
import {
  Gene,
  GeneInteraction,
  Transcript,
  TranscriptInteraction,
} from '../../../interfaces';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatAnchor, MatButton } from '@angular/material/button';
import { InteractionModalComponent } from '../../../components/interaction-modal/interaction-modal.component';
import { MatTooltip } from '@angular/material/tooltip';
import { ModalsService } from '../../../components/modals-service/modals.service';

@Component({
  selector: 'app-active-entities',
  imports: [MatTabsModule, MatCardModule, MatButton, MatAnchor, MatTooltip],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.scss',
})
export class ActiveEntitiesComponent {
  readonly dialog = inject(MatDialog);
  protected BrowseService = BrowseService;
  protected modalsService = inject(ModalsService);
  protected readonly browseService = inject(BrowseService);
  nodes$ = this.browseService.activeNodes$;
  gProfilerUrl = computed(() =>
    BrowseService.getGProfilerUrlForNodes(this.nodes$()),
  );
  edges$ = this.browseService.activeInteractions$;
  level$ = this.browseService.level$;

  openInteractionModal(
    interaction: GeneInteraction | TranscriptInteraction,
  ): void {
    this.dialog.open(InteractionModalComponent, {
      data: {
        interaction: interaction,
        disease: this.browseService.disease$()
      }
    });
  }

  openModal(entity: Gene | Transcript): void {
    this.modalsService.openNodeDialog(entity);
  }
}
