import {Component, inject, model, resource} from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {ExploreComponent} from "./explore/explore.component";
import {PredictComponent} from "./predict/predict.component";
import {VersionsService} from "../../services/versions.service";
import {BackendService} from "../../services/backend.service";
import {PredictFormComponent} from "./predict/form/predict-form.component";
import {ExploreFormComponent} from "./explore/form/explore-form.component";

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
    PredictComponent,
    PredictFormComponent,
    PredictFormComponent,
    ExploreFormComponent
  ],
  styleUrls: ['./spongeffects.component.scss']
})
export class SpongEffectsComponent {
  versionsService = inject(VersionsService);
  backend = inject(BackendService);
  version$ = this.versionsService.versionReadOnly();
  mode = model<'explore' | 'predict'>('explore');

  spongeEffectsRuns = resource({
    request: this.version$,
    loader: (version) => (
      this.backend.getSpongEffectsRuns(version.request)
    )
  })
}
