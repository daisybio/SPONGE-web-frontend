import { Component, signal } from '@angular/core';
import { ExampleExpression } from '../../../interfaces';
import { fromEvent } from 'rxjs';
import { PredictionResultsComponent } from './prediction-results/prediction-results.component';
import { PredictionTableComponent } from "./prediction-results/prediction-table/prediction-table.component";

declare var Plotly: any;


@Component({
  selector: 'app-predict',
  imports: [PredictionResultsComponent, PredictionTableComponent],
  templateUrl: './predict.component.html',
  styleUrl: './predict.component.scss',
})
export class PredictComponent {
  refreshSignal = signal<number>(0);

  constructor() {
    fromEvent(window, 'resize').subscribe(() => {
      this.refresh();
    });
  }

  refresh() {
    this.refreshSignal.update((v) => v + 1);
  }
}
