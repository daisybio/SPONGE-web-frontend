import { Component, inject, input, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { debounceTime } from 'rxjs';
import { ExploreService } from '../../service/explore.service';
import { PredictService } from '../../../predict/service/predict.service';
import { MatExpansionModule } from "@angular/material/expansion";
import { MatAccordion } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { InfoComponent } from '../../../../../components/info/info.component';

@Component({
  selector: 'app-module-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatExpansionModule,
    MatButtonModule,
    MatTooltipModule,
    InfoComponent,
  ],
  templateUrl: './module-form.component.html',
  styleUrl: './module-form.component.scss'
})
export class ModuleFormComponent implements OnInit {
  exploreService = inject(ExploreService);
  predictService = inject(PredictService);
  source = input<'explore' | 'predict'>('explore');

  /** Disable "Show module members" when Module Importance Plot or Enrichment Scores Heatmap is shown */
  membersDisabled = computed(() => {
    if (this.source() === 'explore') {
      if (this.exploreService.selectedTabIndex$() === 2) {
        const vis = this.exploreService.selectedVis();
        if (vis === 'plot') return true;
        if (vis === 'heatmap') {
          return this.exploreService.selectedHeatmapType() === 'enrichment';
        }
      }
      return false;
    }
    const vis = this.predictService.selectedVis$();
    if (this.predictService.selectedTabIndex$() === 2) {
      if (vis === 'importance' || vis === 'plot') return true;
      if (vis === 'heatmap') {
        return this.predictService.selectedHeatmapType$() === 'enrichment';
      }
    }
    return false;
  });

  /** Read the current value from the service, returning false (deactivated) if membersDisabled */
  includeModuleMembersValue = computed(() => {
    if (this.membersDisabled()) {
      return false;
    }
    if (this.source() === 'explore') {
      return this.exploreService.includeModuleMembers() || false;
    }
    return this.predictService.includeModuleMembers$() || false;
  });

  onIncludeMembersChange(checked: boolean) {
    if (this.source() === 'explore') {
      this.exploreService.includeModuleMembers.set(checked);
    } else {
      this.predictService.includeModuleMembers$.set(checked);
    }
  }

  selectAllPatients() {
    this.predictService.selectedSamples$.set(this.predictService.allSamples$());
  }

  clearAllPatients() {
    this.predictService.selectedSamples$.set([]);
  }

  formGroup = new FormGroup({
    topControl: new FormControl<number>(1, [Validators.min(1), Validators.max(100)]),
    includeModuleMembers: new FormControl<boolean>(false),
    sortBy: new FormControl<string>(''),
    filterMinScore1: new FormControl<number | null>(null),
    filterMinScore2: new FormControl<number | null>(null)
  });

  constructor() {
    // Synchronize exploreService/predictService state changes back to form
    effect(() => {
      if (this.source() === 'explore') {
        const topN = this.exploreService.topN();
        if (this.formGroup.get('topControl')?.value !== topN) {
          this.formGroup.get('topControl')?.setValue(topN ?? null, { emitEvent: false });
        }
      } else {
        const topN = this.predictService.topNModules$();
        if (this.formGroup.get('topControl')?.value !== topN) {
          this.formGroup.get('topControl')?.setValue(topN ?? null, { emitEvent: false });
        }
      }
    });

    effect(() => {
      if (this.source() === 'explore') {
        const sortBy = this.exploreService.sortBy();
        if (this.formGroup.get('sortBy')?.value !== sortBy) {
          this.formGroup.get('sortBy')?.setValue(sortBy || '', { emitEvent: false });
        }
      } else {
        const sortBy = this.predictService.sortBy$();
        if (this.formGroup.get('sortBy')?.value !== sortBy) {
          this.formGroup.get('sortBy')?.setValue(sortBy || '', { emitEvent: false });
        }
      }
    });

    effect(() => {
      if (this.source() === 'explore') {
        const minScore1 = this.exploreService.minScore1();
        if (this.formGroup.get('filterMinScore1')?.value !== minScore1) {
          this.formGroup.get('filterMinScore1')?.setValue(minScore1, { emitEvent: false });
        }
      } else {
        const minScore1 = this.predictService.minScore1$();
        if (this.formGroup.get('filterMinScore1')?.value !== minScore1) {
          this.formGroup.get('filterMinScore1')?.setValue(minScore1, { emitEvent: false });
        }
      }
    });

    effect(() => {
      if (this.source() === 'explore') {
        const minScore2 = this.exploreService.minScore2();
        if (this.formGroup.get('filterMinScore2')?.value !== minScore2) {
          this.formGroup.get('filterMinScore2')?.setValue(minScore2, { emitEvent: false });
        }
      } else {
        const minScore2 = this.predictService.minScore2$();
        if (this.formGroup.get('filterMinScore2')?.value !== minScore2) {
          this.formGroup.get('filterMinScore2')?.setValue(minScore2, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit() {
    const defaultSortBy = this.source() === 'explore' ? 'meanAccuracyDecrease' : 'absMeanEnrichmentScore';

    if (this.source() === 'explore') {
      this.formGroup.patchValue({
        topControl: this.exploreService.topN() ?? 1,
        includeModuleMembers: this.exploreService.includeModuleMembers() || false,
        sortBy: this.exploreService.sortBy() || defaultSortBy,
        filterMinScore1: this.exploreService.minScore1(),
        filterMinScore2: this.exploreService.minScore2()
      }, { emitEvent: false });
    } else {
      this.formGroup.patchValue({
        topControl: this.predictService.topNModules$() ?? 15,
        includeModuleMembers: this.predictService.includeModuleMembers$() || false,
        sortBy: this.predictService.sortBy$() || defaultSortBy,
        filterMinScore1: this.predictService.minScore1$(),
        filterMinScore2: this.predictService.minScore2$()
      }, { emitEvent: false });
    }

    // Propagate changes from form to services
    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      if (this.source() === 'explore') {
        this.exploreService.topN.set(value ? value : undefined);
      } else {
        this.predictService.topNModules$.set(value ? value : 15);
      }
    });
    this.formGroup.get('sortBy')?.valueChanges.pipe(debounceTime(100)).subscribe((value) => {
      if (this.source() === 'explore') {
        this.exploreService.sortBy.set(value || '');
      } else {
        this.predictService.sortBy$.set(value || '');
      }
    });
    this.formGroup.get('filterMinScore1')?.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      if (this.source() === 'explore') {
        this.exploreService.minScore1.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
      } else {
        this.predictService.minScore1$.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
      }
    });
    this.formGroup.get('filterMinScore2')?.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      if (this.source() === 'explore') {
        this.exploreService.minScore2.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
      } else {
        this.predictService.minScore2$.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
      }
    });
  }
}
