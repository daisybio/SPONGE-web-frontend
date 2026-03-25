import { Component, effect, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormComponent } from './form/form.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowseViewsComponent } from '../../components/browse-views/browse-views.component';
import { BrowseService } from '../../services/browse.service';

@Component({
  selector: 'app-browse',
  imports: [
    MatSidenavModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    FormComponent,
    MatProgressSpinnerModule,
    BrowseViewsComponent,
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss',
})
export class BrowseComponent {
  selectedTab = signal('Network');

  constructor(public browseService: BrowseService) {
    effect(() => {
      if (this.browseService.isLoading$()) {
        this.selectedTab.set('Network');
      }
    });
  }

  onSelectedTabChange(tabLabel: string) {
    this.selectedTab.set(tabLabel);
  }
}
