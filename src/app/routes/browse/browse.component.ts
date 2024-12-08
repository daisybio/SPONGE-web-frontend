import {Component, computed, signal, Signal} from '@angular/core';
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
    MatIcon
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent {
  hasData$: Signal<boolean>;
  isLoading$: Signal<boolean>;

  tabChange = signal(0);

  constructor(private browseService: BrowseService) {
    this.hasData$ = computed(() => this.browseService.ceRNAs$().length > 0);
    this.isLoading$ = this.browseService.isLoading$;
  }
}
