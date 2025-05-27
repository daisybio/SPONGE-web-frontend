import { Component, inject } from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { InteractionsTableComponent } from '../../interactions-table/interactions-table.component';

@Component({
  selector: 'app-interactions',
  imports: [InteractionsTableComponent],
  templateUrl: './interactions.component.html',
  styleUrl: './interactions.component.scss',
})
export class InteractionsComponent {
  browseService = inject(BrowseService);

  interactions$ = this.browseService.interactions$;
  level$ = this.browseService.level$;
  disease$ = this.browseService.disease$;
}
