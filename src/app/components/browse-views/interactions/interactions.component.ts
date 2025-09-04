import { Component, computed, inject, input } from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { InteractionsTableComponent } from '../../interactions-table/interactions-table.component';

@Component({
  selector: 'app-interactions',
  imports: [InteractionsTableComponent],
  templateUrl: './interactions.component.html',
  styleUrl: './interactions.component.scss',
})
export class InteractionsComponent {
  browseService = input.required<BrowseService>();

  interactions$ = computed(() => this.browseService().interactions$());
  activeInteractions$ = computed(() =>
    this.browseService().activeInteractions$()
  );
  level$ = computed(() => this.browseService().level$());
  disease$ = computed(() => this.browseService().disease$());
}
