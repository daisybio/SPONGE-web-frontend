import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  Resource,
  resource,
  ResourceRef,
  ViewChild
} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {CarouselComponent, SlideComponent} from "ngx-bootstrap/carousel";
import {BackendService} from "../../services/backend.service";
import {Dataset, OverallCounts} from "../../interfaces";
import {MatTab, MatTabGroup} from "@angular/material/tabs";
import {VersionsService} from "../../services/versions.service";
import {ReplaySubject} from "rxjs";
import {MatProgressSpinner} from "@angular/material/progress-spinner";

declare const Plotly: any;

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    CarouselComponent,
    SlideComponent,
    MatTabGroup,
    MatTab,
    MatProgressSpinner
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('cancerPlot') cancerPlot!: ElementRef;
  @ViewChild('nonCancerPlot') nonCancerPlot!: ElementRef;

  overallCounts: ResourceRef<OverallCounts[]>;
  diseases: Resource<Dataset[]>;

  cancerData = computed(() => this.prepareData(this.diseases.value(), this.overallCounts.value(), true));
  nonCancerData = computed(() => this.prepareData(this.diseases.value(), this.overallCounts.value(), false));

  cancerDataSubject = new ReplaySubject<any[] | undefined>();
  nonCancerDataSubject = new ReplaySubject<any[] | undefined>();

  constructor(private backend: BackendService, versionsService: VersionsService) {
    const version = versionsService.versionReadOnly();
    this.diseases = versionsService.diseases$();

    this.overallCounts = resource({
      request: version,
      loader: (param) => this.backend.getOverallCounts(param.request)
    });

    effect(() => {
      this.cancerDataSubject.next(this.cancerData());
    });

    effect(() => {
      this.nonCancerDataSubject.next(this.nonCancerData());
    });
  }

  async ngAfterViewInit() {
    this.cancerDataSubject.subscribe(data => {
      this.plot(this.cancerPlot, data);
    });

    this.nonCancerDataSubject.subscribe(data => {
      this.plot(this.nonCancerPlot, data);
    });
  }

  prepareData(diseases: Dataset[] | undefined, counts: OverallCounts[] | undefined, useCancer: boolean) {
    if (!diseases || !counts) {
      return undefined;
    }

    const usedDiseases = diseases.filter(d => (d.disease_type === 'Cancer') === useCancer);
    const overallCounts = counts.filter(c => usedDiseases.some(d => d.disease_name === c.disease_name));
    const countField = 'count_interactions_sign';
    const sortedCounts = overallCounts.sort((a, b) => b[countField] - a[countField]);

    return [{
      x: sortedCounts.map(c => c.disease_name),
      y: sortedCounts.map(c => c[countField]),
      type: 'bar'
    }];
  }

  async plot(element: ElementRef, plotData: any[] | undefined) {
    if (!plotData) {
      return;
    }

    Plotly.newPlot(element.nativeElement, plotData, {
      title: 'Count of significant interactions',
      yaxis: {
        type: 'log'
      },
      margin: {
        b: 300
      }
    });
  }

  resize() {
    Plotly.Plots.resize(this.cancerPlot.nativeElement);
    Plotly.Plots.resize(this.nonCancerPlot.nativeElement);
  }
}
