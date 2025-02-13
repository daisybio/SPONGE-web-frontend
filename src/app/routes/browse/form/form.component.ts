import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  BrowseQuery,
  InteractionSorting,
} from '../../../interfaces';
import { BrowseService } from '../../../services/browse.service';
import { VersionsService } from '../../../services/versions.service';
import _ from 'lodash';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { DiseaseSelectorComponent } from '../../../components/disease-selector/disease-selector.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-form',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatCheckbox,
    DiseaseSelectorComponent,
    MatCardModule,
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
})
export class FormComponent {
  versionsService = inject(VersionsService);
  browseService = inject(BrowseService);
  version = this.versionsService.versionReadOnly();
  diseases$ = computed(() => this.versionsService.diseases$().value() ?? []);
  activeDataset = linkedSignal(() => this.diseases$()[0]);
  geneSortings: String[] = [];
  interactionSortings = InteractionSorting;
  formGroup = new FormGroup({
    level: new FormControl<'gene' | 'transcript'>('gene'),
    showOrphans: new FormControl<boolean>(false),
    sortingBetweenness: new FormControl<boolean>(true),
    sortingDegree: new FormControl<boolean>(false),
    sortingEigenvector: new FormControl<boolean>(false),
    maxNodes: new FormControl<number>(10),
    minDegree: new FormControl<number>(1),
    minBetweenness: new FormControl<number>(0.05),
    minEigen: new FormControl<number>(0.1),
    interactionSorting: new FormControl<InteractionSorting>(
      this.interactionSortings.pAdj,
    ),
    maxInteractions: new FormControl<number>(100),
    maxPValue: new FormControl<number>(0.05),
    minMscor: new FormControl<number>(0.1),
  });

  protected readonly capitalize = _.capitalize;

  constructor(private cdr: ChangeDetectorRef) {
    this.formGroup.valueChanges.subscribe((config) => {
      const dataset = this.activeDataset();
      if (dataset === undefined) return;
      if ( !config.sortingDegree && !config.sortingBetweenness && !config.sortingEigenvector ) {
        this.formGroup.patchValue({ sortingBetweenness: true });
        this.cdr.detectChanges();
        config.sortingBetweenness = true;
      }
      this.browseService.runQuery({
        ...config,
        dataset,
      } as BrowseQuery);
    });
  }

  getKeys(enumType: any): string[] {
    return Object.values(enumType);
  }
}
