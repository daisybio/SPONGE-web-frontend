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
import { capitalize } from 'lodash';
import { SUBTYPE_DEFAULT } from '../../constants';

@Component({
  selector: 'app-disease-selector',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './disease-selector.component.html',
  styleUrl: './disease-selector.component.scss',
})
export class DiseaseSelectorComponent implements OnDestroy {
  readonly diseases$ = input.required<Dataset[]>();
  selected = output<Dataset>();
  readonly activeDisease$ = linkedSignal(
    () =>
      this.diseaseNames$().filter((d) => d === 'breast invasive carcinoma')[0]
  );
  readonly activeSubtype = linkedSignal(
    () =>
      this.possibleSubtypes$().find(
        (subtype) => subtype.disease_subtype == null
      ) ?? this.possibleSubtypes$()[0]
  );
  protected readonly capitalize = capitalize;
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
  readonly diseaseNames$ = computed(() =>
    Array.from(this._diseaseSubtypeMap$().keys()).sort()
  );
  readonly possibleSubtypes$ = computed(
    () => this._diseaseSubtypeMap$().get(this.activeDisease$()) ?? []
  );
  private readonly _updateOutput = effect(() =>
    this.selected.emit(this.activeSubtype())
  );

  ngOnDestroy() {
    this._updateOutput.destroy();
  }
}
