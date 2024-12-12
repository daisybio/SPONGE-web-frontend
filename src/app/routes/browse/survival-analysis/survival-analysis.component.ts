import {Component, Signal} from '@angular/core';
import {Dataset, GeneNode} from "../../../interfaces";
import {BrowseService} from "../../../services/browse.service";
import {KMPlotComponent} from "./kmplot/kmplot.component";

@Component({
  selector: 'app-survival-analysis',
  imports: [
    KMPlotComponent
  ],
  templateUrl: './survival-analysis.component.html',
  styleUrl: './survival-analysis.component.scss'
})
export class SurvivalAnalysisComponent {
  ceRNAs$: Signal<GeneNode[]>;
  disease$: Signal<Dataset | undefined>;

  constructor(browseService: BrowseService) {
    this.ceRNAs$ = browseService.activeCeRNAs$;
    this.disease$ = browseService.disease$;
  }
}
