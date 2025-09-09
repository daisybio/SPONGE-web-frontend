import {Component, ElementRef, inject, model, resource, ViewChild, AfterViewInit} from '@angular/core';
import {ExploreComponent} from "./explore/explore.component";
import {PredictComponent} from "./predict/predict.component";
import {VersionsService} from "../../services/versions.service";
import {BackendService} from "../../services/backend.service";
import {ExploreService } from './explore/service/explore.service';
import {MatButtonToggleModule } from '@angular/material/button-toggle';
import { InfoComponent } from '../../components/info/info.component';
import { MatDrawerContainer } from '@angular/material/sidenav';
import { MatDivider } from '@angular/material/divider';
import { debounceTime, fromEvent } from 'rxjs';

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
export class SpongEffectsComponent implements AfterViewInit {
  versionsService = inject(VersionsService);
  backend = inject(BackendService);
  exploreService = inject(ExploreService);
  version$ = this.versionsService.versionReadOnly();
  mode = model<'explore' | 'predict'>('explore');

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
