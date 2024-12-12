import {Component, computed, inject, signal} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatTabsModule} from "@angular/material/tabs";
import {ReactiveFormsModule} from "@angular/forms";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormComponent} from "./form/form.component";
import {CeRNAsComponent} from "./ce-rnas/ce-rnas.component";
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

@Component({
  selector: 'app-browse',
  imports: [
    MatSidenavModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    FormComponent,
    CeRNAsComponent,
    InteractionsComponent,
    NetworkComponent,
    HeatmapComponent,
    SurvivalAnalysisComponent,
    ActiveEntitiesComponent,
    MatProgressSpinnerModule,
    MatIcon,
    MatAnchor
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent {
  tabChange = signal(0);
  versionService = inject(VersionsService);
  browseService = inject(BrowseService);
  version$ = this.versionService.versionReadOnly();
  hasData$ = computed(() => this.browseService.ceRNAs$().length > 0);
  isLoading$ = this.browseService.isLoading$;
  rawDataURL$ = this.browseService.rawDataURL();
}
