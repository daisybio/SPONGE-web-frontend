import {Component, inject, model, resource} from '@angular/core';
import {ExploreComponent} from "./explore/explore.component";
import {PredictComponent} from "./predict/predict.component";
import {VersionsService} from "../../services/versions.service";
import {BackendService} from "../../services/backend.service";
import {ExploreService } from './explore/service/explore.service';
import {MatButtonToggleModule } from '@angular/material/button-toggle';
import { InfoComponent } from '../../components/info/info.component';
import { MatDrawerContainer } from '@angular/material/sidenav';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-spongeffects',
  templateUrl: './spongeffects.component.html',
  imports: [
    ExploreComponent,
    PredictComponent,
    MatButtonToggleModule,
    InfoComponent,
    MatDrawerContainer,
],
  styleUrls: ['./spongeffects.component.scss']
})
export class SpongEffectsComponent {
  versionsService = inject(VersionsService);
  backend = inject(BackendService);
  exploreService = inject(ExploreService);
  version$ = this.versionsService.versionReadOnly();
  mode = model<'explore' | 'predict'>('explore');

  spongeEffectsRuns = resource({
    request: this.version$,
    loader: (version) => (
      this.backend.getSpongEffectsRuns(version.request)
    )
  })
}
