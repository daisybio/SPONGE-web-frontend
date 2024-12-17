import {Component} from '@angular/core';
import {
  MatExpansionModule,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatIcon, MatIconModule} from "@angular/material/icon";
import {MatFormFieldModule} from "@angular/material/form-field";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatCardModule} from '@angular/material/card';
import {ClassPerformancePlotComponent} from "./plots/class-performance-plot/class-performance-plot.component";
import {OverallAccPlotComponent} from "./plots/overall-acc-plot/overall-acc-plot.component";

@Component({
  selector: 'app-explore',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelTitle,
    MatIcon,
    MatExpansionPanelDescription,
    MatExpansionModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    ClassPerformancePlotComponent,
    OverallAccPlotComponent
  ],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss', '../spongeffects.component.scss']
})
export class ExploreComponent {
}
