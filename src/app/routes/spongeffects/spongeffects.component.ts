import { Component, ElementRef, inject, model, resource, ViewChild, AfterViewInit } from '@angular/core';
import { ExploreComponent } from "./explore/explore.component";
import { PredictComponent } from "./predict/predict.component";
import { SpongeffectsScoresComponent } from "./spongeffects-scores/spongeffects-scores.component";
import { VersionsService } from "../../services/versions.service";
import { BackendService } from "../../services/backend.service";
import { ExploreService } from './explore/service/explore.service';
import { SpongEffectsService } from '../../services/spong-effects.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { InfoComponent } from '../../components/info/info.component';
import { MatDrawerContainer } from '@angular/material/sidenav';
import { MatDivider } from '@angular/material/divider';
import { debounceTime, fromEvent } from 'rxjs';

@Component({
  selector: 'app-spongeffects',
  templateUrl: './spongeffects.component.html',
  imports: [
    ExploreComponent,
    // PredictComponent,
    SpongeffectsScoresComponent,
    MatButtonToggleModule,
    InfoComponent,
    MatDrawerContainer,
  ],
  styleUrls: ['./spongeffects.component.scss']
})
export class SpongEffectsComponent implements AfterViewInit {
  versionsService = inject(VersionsService);
  backend = inject(BackendService);
  exploreService = inject(ExploreService);
  spongEffectsService = inject(SpongEffectsService);
  version$ = this.versionsService.versionReadOnly();
  mode = this.spongEffectsService.selectedMode$;

  @ViewChild('sectionLine') sectionLine!: ElementRef<HTMLHRElement>;

  ngAfterViewInit() {
    this.exploreService.lineTop.set((this.sectionLine.nativeElement.getBoundingClientRect().top + window.scrollY));
  }

  spongeEffectsRuns = resource({
    request: this.version$,
    loader: (version) => (
      this.backend.getSpongEffectsRuns(version.request)
    )
  })
}
