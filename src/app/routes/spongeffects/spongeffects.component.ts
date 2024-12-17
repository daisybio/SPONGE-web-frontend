import {Component, model} from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {ExploreComponent} from "./explore/explore.component";
import {PredictComponent} from "./predict/predict.component";

// import { Tab, Cancer, PlotlyData } from '../../models/spongeffects.model';

@Component({
  selector: 'app-spongeffects',
  templateUrl: './spongeffects.component.html',
  imports: [
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatButtonToggleGroup,
    MatButtonToggle,
    ExploreComponent,
    PredictComponent
  ],
  styleUrls: ['./spongeffects.component.scss']
})
export class SpongEffectsComponent {
  mode = model<'explore' | 'predict'>('explore');
}
