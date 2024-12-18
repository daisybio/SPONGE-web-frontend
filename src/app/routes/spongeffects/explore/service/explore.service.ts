import {inject, Injectable, linkedSignal, signal} from '@angular/core';
import {SpongEffectsService} from "../../../../services/spong-effects.service";
import {sum} from "lodash";

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
  selectedDisease$ = linkedSignal(() => this.diseaseNames$()[0]);
}
