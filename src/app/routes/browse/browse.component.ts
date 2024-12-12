import {Component, computed, inject, signal} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatTabsModule} from "@angular/material/tabs";
import {ReactiveFormsModule} from "@angular/forms";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormComponent} from "./form/form.component";
import {InteractionsComponent} from "./interactions/interactions.component";
import {NetworkComponent} from "./network/network.component";
import {HeatmapComponent} from "./heatmap/heatmap.component";
import {BrowseService} from "../../services/browse.service";
import {SurvivalAnalysisComponent} from "./survival-analysis/survival-analysis.component";
import {ActiveEntitiesComponent} from "./active-entities/active-entities.component";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatIcon} from "@angular/material/icon";
import {MatAnchor} from "@angular/material/button";
import {VersionsService} from "../../services/versions.service";
import {NodesComponent} from "./nodes/nodes.component";

@Component({
  selector: 'app-browse',
  imports: [
    MatSidenavModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    FormComponent,
    InteractionsComponent,
    NetworkComponent,
    HeatmapComponent,
    SurvivalAnalysisComponent,
    ActiveEntitiesComponent,
    MatProgressSpinnerModule,
    MatIcon,
    MatAnchor,
    NodesComponent
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent {
  tabChange = signal(0);
  versionService = inject(VersionsService);
  browseService = inject(BrowseService);
  level = this.browseService.level$;
  version$ = this.versionService.versionReadOnly();
  hasData$ = computed(() => this.browseService.nodes$().length > 0);
  isLoading$ = this.browseService.isLoading$;
  rawDataURL$ = this.browseService.rawDataURL();
}
