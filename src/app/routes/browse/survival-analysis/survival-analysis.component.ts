import {Component, inject, Signal} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {KMPlotComponent} from "./kmplot/kmplot.component";
import {GeneNode} from "../../../interfaces";

@Component({
  selector: 'app-survival-analysis',
  imports: [
    KMPlotComponent
  ],
  templateUrl: './survival-analysis.component.html',
  styleUrl: './survival-analysis.component.scss'
})
export class SurvivalAnalysisComponent {
  browseService = inject(BrowseService);
  nodes$ = this.browseService.activeNodes$ as Signal<GeneNode[]>;
  disease$ = this.browseService.disease$;
}
