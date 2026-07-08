import { Component, inject, input, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { debounceTime } from 'rxjs';
import { ExploreService } from '../../service/explore.service';

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
    MatCardModule
  ],
  templateUrl: './module-form.component.html',
  styleUrl: './module-form.component.scss'
})
export class ModuleFormComponent implements OnInit {
  exploreService = inject(ExploreService);
  source = input<'explore' | 'predict'>('explore');

  formGroup = new FormGroup({
    topControl: new FormControl<number>(15, [Validators.min(3), Validators.max(100)]),
    markControl: new FormControl<number>(5, [Validators.min(1), Validators.max(100)]),
    includeModuleMembers: new FormControl<boolean>(false),
    sortBy: new FormControl<string>(''),
    filterMinScore1: new FormControl<number | null>(null),
    filterMinScore2: new FormControl<number | null>(null)
  });

  constructor() {
    // Synchronize exploreService state changes back to form (must be in injection context)
    effect(() => {
      const topN = this.exploreService.topN();
      if (this.formGroup.get('topControl')?.value !== topN) {
        this.formGroup.get('topControl')?.setValue(topN ?? null, { emitEvent: false });
      }
    });

    effect(() => {
      const redNodes = this.exploreService.redNodes();
      if (this.formGroup.get('markControl')?.value !== redNodes) {
        this.formGroup.get('markControl')?.setValue(redNodes ?? null, { emitEvent: false });
      }
    });

    effect(() => {
      const value = this.exploreService.includeModuleMembers();
      if (this.formGroup.get('includeModuleMembers')?.value !== value) {
        this.formGroup.get('includeModuleMembers')?.setValue(value || false, { emitEvent: false });
      }
    });

    effect(() => {
      const sortBy = this.exploreService.sortBy();
      if (this.formGroup.get('sortBy')?.value !== sortBy) {
        this.formGroup.get('sortBy')?.setValue(sortBy || '', { emitEvent: false });
      }
    });

    effect(() => {
      const minScore1 = this.exploreService.minScore1();
      if (this.formGroup.get('filterMinScore1')?.value !== minScore1) {
        this.formGroup.get('filterMinScore1')?.setValue(minScore1, { emitEvent: false });
      }
    });

    effect(() => {
      const minScore2 = this.exploreService.minScore2();
      if (this.formGroup.get('filterMinScore2')?.value !== minScore2) {
        this.formGroup.get('filterMinScore2')?.setValue(minScore2, { emitEvent: false });
      }
    });
  }

  ngOnInit() {
    // Determine default sortBy based on source
    const defaultSortBy = this.source() === 'explore' ? 'meanAccuracyDecrease' : 'absMeanEnrichmentScore';

    // Set initial values from exploreService
    this.formGroup.patchValue({
      topControl: this.exploreService.topN() ?? 15,
      markControl: this.exploreService.redNodes() ?? 5,
      includeModuleMembers: this.exploreService.includeModuleMembers() || false,
      sortBy: this.exploreService.sortBy() || defaultSortBy,
      filterMinScore1: this.exploreService.minScore1(),
      filterMinScore2: this.exploreService.minScore2()
    }, { emitEvent: false });

    // Propagate changes from form to exploreService
    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.exploreService.topN.set(value ? value : undefined);
    });
    this.formGroup.get('markControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.exploreService.redNodes.set(value ? value : undefined);
    });
    this.formGroup.get('includeModuleMembers')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.exploreService.includeModuleMembers.set(value || false);
    });
    this.formGroup.get('sortBy')?.valueChanges.pipe(debounceTime(100)).subscribe((value) => {
      this.exploreService.sortBy.set(value || '');
    });
    this.formGroup.get('filterMinScore1')?.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.exploreService.minScore1.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
    });
    this.formGroup.get('filterMinScore2')?.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.exploreService.minScore2.set(value !== null && value !== undefined && !isNaN(value) ? value : null);
    });
  }
}
