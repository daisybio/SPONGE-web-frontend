import {Component, Signal} from '@angular/core';
import {CeRNA, Dataset} from "../../../interfaces";
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
  ceRNAs$: Signal<CeRNA[]>;
  disease$: Signal<Dataset | undefined>;

  constructor(browseService: BrowseService) {
    this.ceRNAs$ = browseService.activeCeRNAs$;
    this.disease$ = browseService.disease$;
  }
}
