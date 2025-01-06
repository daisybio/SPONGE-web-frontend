import {Component, ElementRef, inject, ViewChild, signal} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatTabsModule} from '@angular/material/tabs';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSliderModule} from '@angular/material/slider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {MatProgressBarModule, ProgressBarMode} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatChipsModule} from '@angular/material/chips';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatRadioModule} from '@angular/material/radio';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {ExampleExpression, PlotlyData} from '../../../interfaces';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {timer} from 'rxjs';
import {BackendService} from '../../../services/backend.service';
import {VersionsService} from '../../../services/versions.service';
import { PredictionResultsComponent } from "./prediction-results/prediction-results.component";
import {fromEvent} from "rxjs";


declare var Plotly: any;


const EXAMPLE_GENE_EXPR: ExampleExpression[] = [
  {id: "ENSG00000000233", sample1: 6, sample2: 5, sample3: 8, sample4: 2, sampleN: 1},
  {id: "ENSG00000000412", sample1: 2, sample2: 1, sample3: 2, sample4: 3, sampleN: 4},
  {id: "ENSG00000000442", sample1: 10, sample2: 9, sample3: 8, sample4: 0, sampleN: 7}
]

@Component({
  selector: 'app-predict',
  imports: [
    PredictionResultsComponent,
],
  templateUrl: './predict.component.html',
  styleUrl: './predict.component.scss'
})
export class PredictComponent {
  refreshSignal = signal<number>(0);

  constructor() {
    fromEvent(window, 'resize').subscribe(() => {
      this.refresh();
    });
  }

  refresh() {
    this.refreshSignal.update(v => v + 1);
  }

}