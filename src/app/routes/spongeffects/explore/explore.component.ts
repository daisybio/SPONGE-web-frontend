import {Component} from '@angular/core';
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatFormFieldModule} from "@angular/material/form-field";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatCardModule} from '@angular/material/card';
import {ClassPerformancePlotComponent} from "./plots/class-performance-plot/class-performance-plot.component";
import {OverallAccPlotComponent} from "./plots/overall-acc-plot/overall-acc-plot.component";
import {MatTabsModule} from "@angular/material/tabs";

@Component({
  selector: 'app-explore',
  imports: [
    MatExpansionModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    ClassPerformancePlotComponent,
    OverallAccPlotComponent,
    MatTabsModule,

  ],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss', '../spongeffects.component.scss']
})
export class ExploreComponent {
}
