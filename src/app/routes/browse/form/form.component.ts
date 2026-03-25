import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  OnInit,
  resource,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { BrowseQuery, InteractionSorting, Dataset } from '../../../interfaces';
import { BrowseService } from '../../../services/browse.service';
import { VersionsService } from '../../../services/versions.service';
import {capitalize} from 'lodash';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { DiseaseSelectorComponent } from '../../../components/disease-selector/disease-selector.component';
import { InfoComponent } from '../../../components/info/info.component';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { InfoService } from '../../../services/info.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { ExploreService } from '../../spongeffects/explore/service/explore.service';
import { BackendService } from '../../../services/backend.service';
import { SpongEffectsService } from '../../../services/spong-effects.service';

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
    InfoComponent,
    MatButtonModule,
    CommonModule,
    MatChipsModule,
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
})
export class FormComponent implements OnInit {
  versionsService = inject(VersionsService);
  exploreService = inject(ExploreService);
  spongEffectsService = inject(SpongEffectsService);
  noRunsForSelection = computed(() => {
    if (this.spongEffectsService.spongEffectsRuns$.isLoading()) return false;
    const runs = this.spongEffectsService.spongEffectsRuns$.value() ?? [];
    const disease = this.exploreService.selectedDisease$();
    const level = this.exploreService.level$();
    return runs.filter(r => r.disease_name === disease && r.level === level).length === 0;
  });
  browseService = input.required<BrowseService>();
  selectedTab = input.required<string>();
  selectedTabName = computed(() => this.selectedTab() ?? 'Network');
  version = this.versionsService.versionReadOnly();
  diseases$ = computed(() => this.versionsService.diseases$().value() ?? []);
  fixedDataset = input<Dataset | undefined>();
  fixedLevel = input<(() => 'gene' | 'transcript') | undefined>();
  activeDataset: WritableSignal<Dataset | undefined> = this.fixedDataset ? linkedSignal(() => this.fixedDataset()) : linkedSignal(() => this.diseases$()[0]);
  // default thresholds should be different in spongeffects form
  defaultMinDegree = input<number | undefined>();
  defaultMinBetweenness = input<number | undefined>();
  defaultMinEigen = input<number | undefined>();
  defaultMaxPValue = input<number | undefined>();
  defaultMinMscor = input<number | undefined>();
  geneSortings: String[] = [];
  interactionSortings = InteractionSorting;
  mscorEquation$ = viewChild<ElementRef<HTMLSpanElement>>('mscorEquation');
  infoService = inject(InfoService);
  backend = inject(BackendService);

  private highestKeyResource = resource({
    request: computed(() => ({
      active: this.selectedTabName() === 'Top ceRNA Modules',
      version: this.versionsService.versionReadOnly()(),
      disease: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      paramSets: this.exploreService.paramSets$(),
    })),
    loader: async ({ request }) => {
      const { active, version, disease, level, paramSets } = request;
      if (!active || !version || !disease || !level || !paramSets || paramSets.length === 0) return '';
      let highest_accuracy = 0;
      let highest_key = '';
      for (let i = 0; i < paramSets.length; i++) {
        const key = `paramSet_${i + 1}`;
        const tmp = await this.backend.getRunPerformance(version, disease, level, paramSets[i] as { [key: string]: any });
        tmp.forEach((entry: any) => {
          if (entry.model_type === 'modules' && entry.split_type === 'test') {
            if (entry.accuracy > highest_accuracy) {
              highest_accuracy = entry.accuracy_upper;
              highest_key = key;
            }
          }
        });
      }
      return highest_key;
    },
  });

  formGroup = new FormGroup({
    level: new FormControl<'gene' | 'transcript'>('gene'),
    showOrphans: new FormControl<boolean>(false),
    sortingBetweenness: new FormControl<boolean>(true),
    sortingDegree: new FormControl<boolean>(false),
    sortingEigenvector: new FormControl<boolean>(false),
    maxNodes: new FormControl<number>(10, [
      Validators.min(0),
      Validators.max(100),
    ]),
    minDegree: new FormControl<number>(1, [
      Validators.min(0),
      Validators.max(100),
    ]),
    minBetweenness: new FormControl<number>(0.05, [
      Validators.min(0),
      Validators.max(1),
    ]),
    minEigen: new FormControl<number>(0.1, [
      Validators.min(0),
      Validators.max(1),
    ]),
    interactionSorting: new FormControl<string>(
      this.getKeys(this.interactionSortings)[0]
    ),
    maxInteractions: new FormControl<number>(100, [
      Validators.min(0),
      Validators.max(1000),
    ]),
    maxPValue: new FormControl<number>(0.05, [
      Validators.min(0),
      Validators.max(1),
    ]),
    minMscor: new FormControl<number>(0.1, [
      Validators.min(0),
      Validators.max(2),
    ]),
  });

  protected readonly capitalize = capitalize;

  ngOnInit() {
    // if specific defaults are set (eg spongeffects) 
    this.formGroup.patchValue({
      minDegree: this.defaultMinDegree() ?? 1,
      minBetweenness: this.defaultMinBetweenness() ?? 0.05,
      minEigen: this.defaultMinEigen() ?? 0.1,
      maxPValue: this.defaultMaxPValue() ?? 0.05,
      minMscor: this.defaultMinMscor() ?? 0.1,
    });
  }

  constructor(private cdr: ChangeDetectorRef) {
    const formSignal = signal(this.formGroup.value);
    this.formGroup.valueChanges.subscribe((val) => {
      formSignal.set(val);
      // Mark all controls as touched to show validation messages
      Object.keys(this.formGroup.controls).forEach((key) => {
        this.formGroup.get(key)?.markAsTouched();
      });
    });

    this.formGroup.valueChanges.subscribe((config) => {
      if (
        !config.sortingDegree &&
        !config.sortingBetweenness &&
        !config.sortingEigenvector
      ) {
        this.formGroup
          .get('sortingBetweenness')
          ?.setValue(true, { emitEvent: false });
        this.cdr.detectChanges();
        config.sortingBetweenness = true;
      }
    });

    effect(() => {
      const config = formSignal();
      const dataset = this.activeDataset();
      if (dataset === undefined) return;
      if (!this.formGroup.valid) return;
      this.browseService().runQuery({
        ...config,
        dataset,
      } as BrowseQuery);
    });

    effect(() => {
      this.infoService.renderMscorEquation(this.mscorEquation$()!);
    });

    effect(() => {
      const key = this.highestKeyResource.value();
      if (key !== undefined) this.exploreService.highestKey.set(key);
    });

    // Sync disease and level to ExploreService when on 'Top ceRNA Modules' tab
    effect(() => {
      if (this.selectedTabName() === 'Top ceRNA Modules') {
        const dataset = this.activeDataset();
        if (dataset?.disease_name) {
          this.exploreService.selectedDisease$.set(dataset.disease_name);
        }
        const level = this.formGroup.get('level')?.value;
        if (level) {
          this.exploreService.level$.set(level);
        }
      }
    });

    this.formGroup.get('level')?.valueChanges.subscribe((level) => {
      if (this.selectedTabName() === 'Top ceRNA Modules' && level) {
        this.exploreService.level$.set(level);
      }
    });

    effect(() => {
      if (this.fixedLevel()) {
        this.formGroup.get('level')?.setValue(this.fixedLevel()!(), { emitEvent: true });
        // this.browseService().runQuery({
        //   ...formSignal(),
        //   level: this.fixedLevel()!(),
        //   dataset: this.activeDataset()!,
        //   ensemblID: this.exploreService().ensemblID(),
        // } as BrowseQuery);
      // } else {
      //   const dataset = this.activeDataset();
      //   const config = formSignal();
      //   if (dataset === undefined) return;
      //   this.browseService().runQuery({
      //     ...config,
      //     level: this.fixedLevel()!(),
      //     dataset: dataset,
      //     showOrphans: config.showOrphans ?? false,
      //     sortingBetweenness: config.sortingBetweenness ?? false,
      //     sortingDegree: config.sortingDegree ?? false,
      //     sortingEigenvector: config.sortingEigenvector ?? false,
      //     maxNodes: config.maxNodes ?? 10,
      //     minDegree: config.minDegree ?? 1,
      //     minBetweenness: config.minBetweenness ?? 0.05,
      //     minEigen: config.minEigen ?? 0.1,
      //     maxInteractions: config.maxInteractions ?? 100,
      //     maxPValue: config.maxPValue ?? 0.05,
      //     minMscor: config.minMscor ?? 0.1,
      //     interactionSorting: (config.interactionSorting ?? this.getKeys(this.interactionSortings)[0]) as InteractionSorting,
      //   });
      }
    });
  }

  getKeys(enumType: any): string[] {
    return Object.keys(enumType);
  }

  getEntries(enumType: any): {
    key: string;
    value: string;
  }[] {
    return Object.entries(enumType).map(([key, value]) => ({
      key,
      value: value as string,
    }));
  }

  trackByKey(item: any): string {
    return item.key;
  }
}
