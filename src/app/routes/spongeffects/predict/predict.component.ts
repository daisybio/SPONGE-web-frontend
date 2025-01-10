import { Component, signal } from '@angular/core';
import { ExampleExpression } from '../../../interfaces';
import { fromEvent } from 'rxjs';
import { PredictionResultsComponent } from './prediction-results/prediction-results.component';

declare var Plotly: any;

const EXAMPLE_GENE_EXPR: ExampleExpression[] = [
  {
    id: 'ENSG00000000233',
    sample1: 6,
    sample2: 5,
    sample3: 8,
    sample4: 2,
    sampleN: 1,
  },
  {
    id: 'ENSG00000000412',
    sample1: 2,
    sample2: 1,
    sample3: 2,
    sample4: 3,
    sampleN: 4,
  },
  {
    id: 'ENSG00000000442',
    sample1: 10,
    sample2: 9,
    sample3: 8,
    sample4: 0,
    sampleN: 7,
  },
];

@Component({
  selector: 'app-predict',
  imports: [PredictionResultsComponent],
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
