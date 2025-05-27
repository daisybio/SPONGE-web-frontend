import { Component, computed, inject, input, Signal } from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { KMPlotComponent } from './kmplot/kmplot.component';
import { GeneNode } from '../../../interfaces';

@Component({
  selector: 'app-survival-analysis',
  imports: [KMPlotComponent],
  templateUrl: './survival-analysis.component.html',
  styleUrl: './survival-analysis.component.scss',
})
export class SurvivalAnalysisComponent {
  browseService = input.required<BrowseService>();
  nodes$ = computed(() => this.browseService().activeNodes$() as GeneNode[]);
  refresh$ = input<any>(0, { alias: 'refresh' });
  disease$ = computed(() => this.browseService().disease$());
}
