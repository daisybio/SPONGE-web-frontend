import {Component, computed, effect, input, linkedSignal, model, OnDestroy, output} from '@angular/core';
import {Dataset} from "../../interfaces";

@Component({
  selector: 'app-disease-selector',
  imports: [],
  templateUrl: './disease-selector.component.html',
  styleUrl: './disease-selector.component.scss'
})
export class DiseaseSelectorComponent implements OnDestroy{
  private readonly _diseases$ = input.required<Dataset[]>()
  selected = output<Dataset>()

  private readonly _diseaseSubtypeMap$ = computed(() => {
    const diseaseSubtypes = new Map<string, Dataset[]>();
    (this._diseases$() || []).forEach(disease => {
      const diseaseName = disease.disease_name;
      if (!diseaseSubtypes.has(diseaseName)) {
        diseaseSubtypes.set(diseaseName, []);
      }
      diseaseSubtypes.get(diseaseName)?.push(disease);
    });
    return diseaseSubtypes;
  });

  readonly diseaseNames$ = computed(() => Array.from(this._diseaseSubtypeMap$().keys()).sort())
  readonly activeDisease$ = linkedSignal<string>(() => this.diseaseNames$()[0])
  readonly possibleSubtypes$ = computed(() => this._diseaseSubtypeMap$().get(this.activeDisease$()) ?? [])
  readonly activeSubtype = linkedSignal(() => this.possibleSubtypes$().find(subtype => subtype.disease_subtype == null) ?? this.possibleSubtypes$()[0])

  private readonly _updateOutput = effect(() => this.selected.emit(this.activeSubtype()))

  ngOnDestroy() {
    this._updateOutput.destroy();
  }
}
