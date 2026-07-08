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
} from '../../../interfaces';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatAnchor, MatButton } from '@angular/material/button';
import { InteractionModalComponent } from '../../interaction-modal/interaction-modal.component';
import { MatTooltip } from '@angular/material/tooltip';
import { ModalsService } from '../../modals-service/modals.service';
import { MatIcon } from "@angular/material/icon";
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-active-entities',
  imports: [MatTabsModule, MatCardModule, MatButton, MatAnchor, MatTooltip, MatIcon],
  templateUrl: './active-entities.component.html',
  styleUrl: './active-entities.component.scss',
})
export class ActiveEntitiesComponent {
  readonly dialog = inject(MatDialog);
  protected BrowseService = BrowseService;
  protected activeTabIndex = model<number>(0);
  protected modalsService = inject(ModalsService);
  browseService = input.required<BrowseService>();
  cartService = inject(CartService);

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

  openModal(entity: Gene | Transcript): void {
    this.modalsService.openNodeDialog(entity);
  }

  addToCart(ensemblID: string, symbol?: string) {
    if (ensemblID.startsWith('ENSG')) {
      this.cartService.add({
        ensg_number: ensemblID,
        gene_symbol: symbol
      } as Gene);
    } else {
      this.cartService.add({
        enst_number: ensemblID,
        gene: { gene_symbol: symbol || ensemblID, ensg_number: '' }
      } as Transcript);
    }
  }
}
