import {Component, signal, inject} from '@angular/core';
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatFormFieldModule} from "@angular/material/form-field";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatCardModule} from '@angular/material/card';
import {ClassPerformancePlotComponent} from "./plots/class-performance-plot/class-performance-plot.component";
import {OverallAccPlotComponent} from "./plots/overall-acc-plot/overall-acc-plot.component";
import {MatTabsModule} from "@angular/material/tabs";
import {fromEvent} from "rxjs";
import { EnrichmentClassPlotComponent } from './plots/enrichment-class-plot/enrichment-class-plot.component';
import { LollipopPlotComponent } from './plots/lollipop-plot/lollipop-plot.component';
import { BrowseService } from '../../../services/browse.service';
import { ExploreService } from './service/explore.service';
import { ExploreFormComponent } from './form/explore-form.component';
import { FormComponent } from '../../browse/form/form.component';
import { MatDrawerContainer, MatDrawer, MatDrawerContent} from '@angular/material/sidenav';
import { ExploreBrowseService } from '../../../services/explore.browse.service';

@Component({
  selector: 'app-explore',
  imports: [
    MatExpansionModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    ClassPerformancePlotComponent,
    OverallAccPlotComponent,
    MatTabsModule,
    EnrichmentClassPlotComponent,
    LollipopPlotComponent,
    ExploreFormComponent, 
    FormComponent,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
  ],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss', '../spongeffects.component.scss'],
  providers: [{
    provide: BrowseService, 
    useClass: ExploreBrowseService 
  }]
})
export class ExploreComponent {
  refreshSignal = signal<number>(0);
  exploreService = inject(ExploreService)
  lineTop = this.exploreService.lineTop;
  selectedTabIndex = this.exploreService.selectedTabIndex$;
  selectedVis = this.exploreService.selectedVis;

  constructor(public browseService: BrowseService) {
    fromEvent(window, 'resize').subscribe(() => {
      this.refresh();
    });
  }

  refresh() {
    this.refreshSignal.update(v => v + 1);
  }

  // track the selected tab to show the network form only for top ceRNA tab
  onTabChange(event: any) {
    // If called via selectedTabChange event, event is { index: number, tab: MatTab }
    // If called via selectedIndexChange, event is a number. Handle both.
    const index = typeof event === 'number' ? event : event.index;
    this.selectedTabIndex.set(index);
    this.refresh();
  }
}
