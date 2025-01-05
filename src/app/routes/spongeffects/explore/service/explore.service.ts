import {inject, Injectable, linkedSignal, signal, computed, WritableSignal} from '@angular/core';
import {SpongEffectsService} from "../../../../services/spong-effects.service";
import {sum} from "lodash";
import {Dataset} from "../../../../interfaces";

export class Cancer {
  value: string;
  viewValue: string;
  allSubTypes: string[];
  sampleSizes: number[];

  base: string = "https://portal.gdc.cancer.gov/projects/TGCA-";

  constructor(value: string, viewValue: string, allSubTypes: string[], sampleSizes: number[],) {
    this.value = value;
    this.viewValue = viewValue;
    this.allSubTypes = allSubTypes;
    this.sampleSizes = sampleSizes;
  }

  addSubtype(subtype: string) {
    this.allSubTypes.push(subtype);
  }

  addSampleSize(sampleSize: number) {
    if (sampleSize != null) this.sampleSizes.push(sampleSize);
  }

  totalNumberOfSamples() {
    return sum(this.sampleSizes.filter(s => s >= 0));
  }

  toString() {
    return this.viewValue + " - (" + this.value + ")";
  }

  getUrl() {
    return this.base + this.value
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExploreService {
  spongEffectsService = inject(SpongEffectsService);
  level$ = signal<'gene' | 'transcript'>('gene');
  diseaseNames$ = this.spongEffectsService.diseaseNames$;
  diseases$ = this.spongEffectsService.datasets$;
  selectedDisease$ = linkedSignal(() => this.diseaseNames$()[0]);
  selectedDiseaseObject$: WritableSignal<Dataset> = linkedSignal(() => {
    const selectedDisease = this.selectedDisease$();
    const datasets = this.diseases$();
    const selectedDataset = datasets.find(d => d.disease_name === selectedDisease);
    if (!selectedDataset) {
      throw new Error('Selected disease not found in datasets: ' + selectedDisease);
    }
    return selectedDataset;
  });
  // selectedDisease$ = linkedSignal(() => this.diseases$()[0]);
  // selectedDisease$ = linkedSignal(() => this.diseases$().find(d => d.disease_name === this.selectedDiseaseName$()));

  // selectedDisease$ = linkedSignal(() => this.diseases$()[0]);
  // selectedDiseaseName$ = linkedSignal(() => this.selectedDisease$().disease_name);
  // diseaseNames$ = linkedSignal(() => this.spongEffectsService.datasets$().map(d => d.disease_name));
  // per default select first disease
  // selectedDisease$ = linkedSignal(() => this.spongEffectsService.datasets$()[0]);
  // selectedDiseaseName$ = linkedSignal(() => this.spongEffectsService.datasets$()[0].disease_name);
}
