import { Component, signal, inject, effect, computed } from '@angular/core';
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatCardModule } from '@angular/material/card';
import { ClassPerformancePlotComponent } from "./plots/class-performance-plot/class-performance-plot.component";
import { OverallAccPlotComponent } from "./plots/overall-acc-plot/overall-acc-plot.component";
import { MatTabsModule } from "@angular/material/tabs";
import { fromEvent } from "rxjs";
import { EnrichmentClassPlotComponent } from './plots/enrichment-class-plot/enrichment-class-plot.component';
import { ImportancePlotComponent } from './plots/lollipop-plot/lollipop-plot.component';
import { BrowseService } from '../../../services/browse.service';
import { ExploreService } from './service/explore.service';
import { ExploreFormComponent } from './form/explore-form.component';
import { NetworkFiltersComponent } from '../../../components/network-filters/network-filters.component';
import { ModuleFormComponent } from './form/module-form/module-form.component';
import { MatDrawerContainer, MatDrawer, MatDrawerContent } from '@angular/material/sidenav';
import { ExploreBrowseService } from '../../../services/explore.browse.service';
import { UmapPlotComponent } from '../predict/umap-plot/umap-plot.component';
import { NetworkComponent } from '../../../components/browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../../../components/browse-views/active-entities/active-entities.component';

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
    ImportancePlotComponent,
    ExploreFormComponent,
    NetworkFiltersComponent,
    ModuleFormComponent,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    UmapPlotComponent,
    NetworkComponent,
    ActiveEntitiesComponent,
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
  selectedTabIndex = this.exploreService.selectedTabIndex$;

  // True while the reference network is (re)building — covers both the module-resolution phase
  // (e.g. after changing Disease) and the network fetch itself, so the spinner shows throughout.
  isNetworkLoading = computed(() =>
    this.browseService.isLoading$() || this.exploreService.selectedModules.isLoading()
  );

  // Once the active tab has finished its initial load, prefetch the other tabs on idle so
  // switching to them is instant. preserveContent keeps them mounted, so returning never
  // refetches. See tabReady().
  preloadOtherTabs = signal<boolean>(false);

  constructor(public browseService: BrowseService) {
    fromEvent(window, 'resize').subscribe(() => {
      this.refresh();
    });

    effect(() => {
      const activeLoading = this.browseService.isLoading$();
      if (!activeLoading && !this.preloadOtherTabs()) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => this.preloadOtherTabs.set(true));
        } else {
          setTimeout(() => this.preloadOtherTabs.set(true), 500);
        }
      }
    });
  }

  /** See spongeffects-scores tabReady(): render when selected or once preloading kicks in. */
  tabReady(index: number): boolean {
    return this.selectedTabIndex() === index || this.preloadOtherTabs();
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
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }
}
