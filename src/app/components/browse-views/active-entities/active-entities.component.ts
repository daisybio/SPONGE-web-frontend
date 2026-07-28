import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  model,
  input,
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowseService } from '../../../services/browse.service';
import {
  Gene,
  GeneInteraction,
  Transcript,
  TranscriptInteraction,
  GeneNode,
  TranscriptNode,
} from '../../../interfaces';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatAnchor, MatButton } from '@angular/material/button';
import { InteractionModalComponent } from '../../interaction-modal/interaction-modal.component';
import { MatTooltip } from '@angular/material/tooltip';
import { ModalsService } from '../../modals-service/modals.service';
import { AddToCartButtonComponent } from '../../add-to-cart-button/add-to-cart-button.component';
import { InfoComponent } from '../../info/info.component';

@Component({
  selector: 'app-active-entities',
  imports: [MatTabsModule, MatCardModule, MatButton, MatAnchor, MatTooltip, AddToCartButtonComponent, InfoComponent],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.scss',
})
export class ActiveEntitiesComponent {
  readonly dialog = inject(MatDialog);
  protected BrowseService = BrowseService;
  protected activeTabIndex = model<number>(0);
  protected modalsService = inject(ModalsService);
  browseService = input.required<BrowseService>();

  constructor() {
    effect(() => {
      this.activeTabIndex.set(
        this.browseService().lastClicked() === 'node' ? 0 : 1
      );
    });
  }

  nodes$ = computed(() => this.browseService().activeNodes$());
  gProfilerUrl = computed(() =>
    BrowseService.getGProfilerUrlForNodes(this.nodes$())
  );
  edges$ = computed(() => this.browseService().activeInteractions$());
  level$ = computed(() => this.browseService().level$());

  isVirtualEdge(interaction: GeneInteraction | TranscriptInteraction): boolean {
    const int = interaction as any;
    return !!(
      int.isVirtual ||
      int.mscor === '< 0.2' ||
      int.mscor === '<0.1' ||
      int.p_value === '> 0.2' ||
      int.sponge_run?.sponge_run_ID === 0
    );
  }

  openInteractionModal(
    interaction: GeneInteraction | TranscriptInteraction
  ): void {
    this.dialog.open(InteractionModalComponent, {
      data: {
        interaction: interaction,
        disease: this.browseService().disease$(),
      },
    });
  }

  openModal(entity: GeneNode | TranscriptNode | Gene | Transcript): void {
    this.modalsService.openNodeDialog(entity);
  }
}
