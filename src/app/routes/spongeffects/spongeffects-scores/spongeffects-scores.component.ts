import { Component, effect, inject, signal } from '@angular/core';
import { PredictFormComponent } from '../predict/form/predict-form.component';
import { PredictService } from '../predict/service/predict.service';
import { BrowseService } from '../../../services/browse.service';
import { NetworkComponent } from '../../../components/browse-views/network/network.component';
import { ActiveEntitiesComponent } from '../../../components/browse-views/active-entities/active-entities.component';
import { DiseaseSelectorComponent } from '../../../components/disease-selector/disease-selector.component';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spongeffects-scores',
  imports: [
    PredictFormComponent,
    DiseaseSelectorComponent,
    NetworkComponent,
    ActiveEntitiesComponent,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatButtonToggleModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    CommonModule,
  ],
  providers: [BrowseService],
  templateUrl: './spongeffects-scores.component.html',
  styleUrl: './spongeffects-scores.component.scss',
})
export class SpongeffectsScoresComponent {
  predictService = inject(PredictService);
  browseService = inject(BrowseService);
  refreshSignal = signal<number>(0);

  constructor() {
    effect(() => {
      const networkData = this.predictService.moduleNetworkData$.value();
      this.browseService.setManualData(networkData);
    });
  }
}
