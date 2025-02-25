import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  BrowseQuery,
  GeneSorting,
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
import { InfoComponent } from '../../../components/info/info.component';
import {MatButtonModule} from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { InfoService } from '../../../services/info.service';

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
    InfoComponent,
    MatButtonModule,
    CommonModule
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
  geneSortings = GeneSorting;
  interactionSortings = InteractionSorting;
  mscorEquation$ = viewChild<ElementRef<HTMLSpanElement>>('mscorEquation');
  infoService = inject(InfoService);  
  formGroup = new FormGroup({
    level: new FormControl<'gene' | 'transcript'>('gene'),
    showOrphans: new FormControl<boolean>(false),
    geneSorting: new FormControl<string>(this.getKeys(this.geneSortings)[0]),
    maxNodes: new FormControl<number>(10),
    minDegree: new FormControl<number>(1),
    minBetweenness: new FormControl<number>(0.05),
    minEigen: new FormControl<number>(0.1),
    interactionSorting: new FormControl<string>(
      this.getKeys(this.interactionSortings)[0]
    ),
    maxInteractions: new FormControl<number>(100),
    maxPValue: new FormControl<number>(0.05),
    minMscor: new FormControl<number>(0.1),
  });

  protected readonly capitalize = _.capitalize;

  constructor() {
    const formSignal = signal(this.formGroup.value);
    this.formGroup.valueChanges.subscribe((val) => formSignal.set(val));

    effect(() => {
      const config = formSignal();
      const dataset = this.activeDataset();
      if (dataset === undefined) return;
      this.browseService.runQuery({
        ...config,
        dataset,
      } as BrowseQuery);
    });

    effect(() => {
      this.infoService.renderMscorEquation(this.mscorEquation$()!);
    });
  }

  getKeys(enumType: any): string[] {
    return Object.keys(enumType)
  }

  getEntries(enumType: any): {
    key: string;
    value: string;
}[] {
    return Object.entries(enumType).map(([key, value]) => ({key, value: value as string }));
  }

  trackByKey(item: any): string {
    return item.key;
  }
}
