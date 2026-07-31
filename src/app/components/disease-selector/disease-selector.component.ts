import {
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  OnDestroy,
  output,
} from '@angular/core';
import { Dataset } from '../../interfaces';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { capitalize } from 'lodash';
import { getDiseaseDisplayName, sortDiseaseNames } from '../../cancer-colors';
import { SUBTYPE_DEFAULT } from '../../constants';

@Component({
  selector: 'app-disease-selector',
  imports: [MatFormFieldModule, MatSelectModule, MatDividerModule],
  templateUrl: './disease-selector.component.html',
  styleUrl: './disease-selector.component.scss',
})
export class DiseaseSelectorComponent implements OnDestroy {
  readonly diseases$ = input.required<Dataset[]>();
  readonly initialDiseaseName$ = input<string | undefined>(undefined);
  selected = output<Dataset>();
  readonly activeDisease$ = linkedSignal(
    () => {
      const names = this.diseaseNames$();
      const initial = this.initialDiseaseName$();
      if (initial && names.some((n) => n.toLowerCase() === initial.toLowerCase())) {
        return names.find((n) => n.toLowerCase() === initial.toLowerCase())!;
      }
      return names.find((d) => d.toLowerCase() === 'pancancer') ?? names[0];
    }
  );
  readonly activeSubtype = linkedSignal(
    () =>
      this.possibleSubtypes$().find(
        (subtype) => subtype.disease_subtype == null
      ) ?? this.possibleSubtypes$()[0]
  );
  protected readonly capitalize = capitalize;
  protected readonly getDiseaseDisplayName = getDiseaseDisplayName;
  protected readonly SUBTYPE_DEFAULT = SUBTYPE_DEFAULT;
  private readonly _diseaseSubtypeMap$ = computed(() => {
    const diseaseSubtypes = new Map<string, Dataset[]>();
    (this.diseases$() || []).forEach((disease) => {
      const diseaseName = disease.disease_name;
      if (!diseaseSubtypes.has(diseaseName)) {
        diseaseSubtypes.set(diseaseName, []);
      }
      diseaseSubtypes.get(diseaseName)?.push(disease);
    });
    return diseaseSubtypes;
  });
  readonly diseaseNames$ = computed(() => {
    return sortDiseaseNames(Array.from(this._diseaseSubtypeMap$().keys()));
  });
  readonly possibleSubtypes$ = computed(
    () => this._diseaseSubtypeMap$().get(this.activeDisease$()) ?? []
  );

  // Calculate sample counts for each disease using the 'unspecific' (disease_subtype == null) dataset count
  readonly diseaseSampleCounts$ = computed(() => {
    const counts = new Map<string, number>();
    this._diseaseSubtypeMap$().forEach((subtypes, diseaseName) => {
      const unspecific = subtypes.find((d) => d.disease_subtype == null || d.disease_subtype === '');
      const count = unspecific ? unspecific.sample_count : (subtypes[0]?.sample_count || 0);
      counts.set(diseaseName, count);
    });
    return counts;
  });

  private readonly _updateOutput = effect(() =>
    this.selected.emit(this.activeSubtype())
  );

  ngOnDestroy() {
    this._updateOutput.destroy();
  }
}
