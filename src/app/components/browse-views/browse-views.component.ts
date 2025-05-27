import { Component, computed, inject, input, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { InteractionsComponent } from '../../components/browse-views/interactions/interactions.component';
import { NetworkComponent } from '../../components/browse-views/network/network.component';
import { HeatmapComponent } from '../../components/browse-views/heatmap/heatmap.component';
import { BrowseService } from '../../services/browse.service';
import { SurvivalAnalysisComponent } from '../../components/browse-views/survival-analysis/survival-analysis.component';
import { ActiveEntitiesComponent } from '../../components/browse-views/active-entities/active-entities.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { VersionsService } from '../../services/versions.service';
import { NodesComponent } from '../../components/browse-views/nodes/nodes.component';
import { GSEAComponent } from '../../components/browse-views/gsea/gsea.component';
import { DiseaseSimilarityComponent } from '../../components/browse-views/disease-distances/disease-similarity.component';
import { fromEvent } from 'rxjs';
import { capitalize } from 'lodash';

@Component({
  selector: 'app-browse-views',
  imports: [
    MatSidenavModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    InteractionsComponent,
    NetworkComponent,
    HeatmapComponent,
    SurvivalAnalysisComponent,
    ActiveEntitiesComponent,
    MatProgressSpinnerModule,
    MatIcon,
    NodesComponent,
    GSEAComponent,
    DiseaseSimilarityComponent,
  ],
  templateUrl: './browse-views.component.html',
  styleUrl: './browse-views.component.scss',
})
export class BrowseViewsComponent {
  refresh$ = signal(0);
  versionService = inject(VersionsService);
  browseService = input.required<BrowseService>();
  level = computed(() => this.browseService().level$());
  version$ = this.versionService.versionReadOnly();
  hasData$ = computed(() => this.browseService().nodes$().length > 0);
  isLoading$ = computed(() => this.browseService().isLoading$());
  rawDataURL$ = computed(() => this.browseService().rawDataURL()());
  hasNetworkResults$ = computed(
    () => this.browseService().networkResults$() !== undefined
  );
  hasGseaContrasts$ = computed(
    () => this.browseService().possibleComparisons$().length > 0
  );
  protected readonly capitalize = capitalize;

  constructor() {
    fromEvent(window, 'resize').subscribe(() => this.refresh());
  }

  refresh = () => this.refresh$.update((v) => v + 1);
}
