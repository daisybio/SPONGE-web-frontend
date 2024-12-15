import {Component, computed, effect, Signal, inject, ResourceRef, resource, ViewChild, ElementRef} from '@angular/core';
import {MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelTitle,
  MatExpansionModule
} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatOption, MatSelect} from "@angular/material/select";
import {FormsModule} from "@angular/forms";
import {max, min, sum} from 'simple-statistics';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {MatButtonToggleModule } from '@angular/material/button-toggle';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatIconModule} from '@angular/material/icon';
import {ExploreService} from '../../../services/explore.service';
import {Dataset, ExploreQuery, PlotlyData, Metric, RunPerformance} from '../../../interfaces';
import {AsyncPipe} from "@angular/common";
import {BrowseService} from "../../../services/browse.service";
import {VersionsService} from "../../../services/versions.service";
import {toSignal} from "@angular/core/rxjs-interop";
import {BackendService} from "../../../services/backend.service";
import { MatCardModule } from '@angular/material/card';
import { ClassPerformancePlotComponent } from "./plots/class-performance-plot/class-performance-plot.component";
import { OverallAccPlotComponent } from "./plots/overall-acc-plot/overall-acc-plot.component";


declare const Plotly: any;

export class Cancer {
  value: string;
  viewValue: string;
  allSubTypes: string[];
  sampleSizes: number[];

  base: string = "https://portal.gdc.cancer.gov/projects/TGCA-";

  constructor(value: string, viewValue: string, allSubTypes: string[], sampleSizes: number[], ) {
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


@Component({
  selector: 'app-explore',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelTitle,
    MatIcon,
    MatExpansionPanelDescription,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelect,
    MatOption,
    FormsModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    ClassPerformancePlotComponent,
    OverallAccPlotComponent
],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss', '../spongeffects.component.scss']
})
export class ExploreComponent {
  versionService = inject(VersionsService);
  browseService = inject(BrowseService);
  exploreService = inject(ExploreService);
  backend = inject(BackendService);
  levels = ['gene', 'transcript'];
  formGroup = new FormGroup({
    selectedCancer: new FormControl<string>(''),
    selectedLevel:  new FormControl<'gene' | 'transcript'>('gene'),
  });
  // diseaseSignal = toSignal(
  //   this.formGroup.get('selectedCancer')!.valueChanges
  // )

  // cancers: Promise<Dataset[]>;
  // cancers = this.exploreService.spongEffectsRunDataset().disease_name;
  // diseaseSubtypeMap = this.versionService.diseaseSubtypeMap();
  // cancers = computed(() => {
  //   return Array.from(new Set(this.spongEffectsRuns.then(run => run.map(run => run.disease_name)))); //.sort((a, b) => a.localeCompare(b));
  // });
    // cancers = computed(() => Array.from(this.spongEffectsRunDatasets()));
    // cancers = computed(() => Array.from(this.diseaseSubtypeMap().keys()));
    cancers = this.exploreService.spongEffectsRunDataset();
    // .filter(cancer => cancer in this.spongEffectsRuns.then(runs => runs.map(run => this.capitalize(run.disease_name))))
    // .filter(cancer => cancer.startsWith('breast'))
    // .sort((a, b) => a.localeCompare(b)));

    setInitialCancer = effect(() => {
      const cancers = this.cancers();
      this.formGroup.get('selectedCancer')?.setValue(cancers[0]);
    });

    //////////////////////////////////////////
    /////////// Plotting variables ///////////
    //////////////////////////////////////////

  constructor() {
    // watch dropdown menu
    this.formGroup.valueChanges.subscribe((config) => {
      config.selectedCancer = this.formGroup.get('selectedCancer')?.value as string;
      config.selectedLevel = this.formGroup.get('selectedLevel')?.value as 'gene' | 'transcript' | null | undefined;
      this.exploreService.runQuery(config as ExploreQuery);
    })
    // Plot 1: Overall Accuracy


    // effect(() => {
    //   this.plotData$.next(plotData.value());
    // });

    // effect(() => {
    //   this.refreshSignal();
    //   this.refresh();
    // });

  }

  

  
  clearResults() {
//     // allow new queries
//     this.exploreResultsQueried = false;
//     // clear plot divs
//     this.overallAccPlotDiv.nativeElement.innerHTML = "";
//     this.enrichmentScoresByClassPlotDiv.nativeElement.innerHTML = "";
//     this.lollipopPlotDiv.nativeElement.innerHTML = "";
  }

  public capitalize(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  //////////////////////////////////////////
  /////////// Plotting functions ///////////
  //////////////////////////////////////////


  // refresh() {
  //   if (this.overallAccPlot && this.overallAccPlot.nativeElement.checkVisibility()) {
  //     Plotly.Plots.resize(this.overallAccPlot.nativeElement);
  //   }
  // }

  // ngOnDestroy(): void {
  //   Plotly.purge(this.overallAccPlot.nativeElement);
  // }

}
