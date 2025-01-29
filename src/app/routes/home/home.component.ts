import {
  Component,
  computed,
  effect,
  ElementRef,
  OnDestroy,
  Resource,
  resource,
  ResourceRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarouselComponent, SlideComponent } from 'ngx-bootstrap/carousel';
import { BackendService } from '../../services/backend.service';
import { Dataset, OverallCounts } from '../../interfaces';
import { VersionsService } from '../../services/versions.service';
import { fromEvent } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

declare const Plotly: any;

@Component({
  selector: 'app-home',
  imports: [FormsModule, CarouselComponent, SlideComponent, MatProgressSpinner],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnDestroy {
  plotDiv$ = viewChild.required<ElementRef<HTMLDivElement>>('plot');

  overallCounts: ResourceRef<OverallCounts[] | undefined>;
  diseases: Resource<Dataset[] | undefined>;

  plotData$ = computed(() => this.prepareData(this.overallCounts.value()));
  updatePlotEffect = effect(() => {
    const div = this.plotDiv$().nativeElement;
    const data = this.plotData$();

    if (!data) {
      return;
    }

    Plotly.newPlot(div, data, {
      title: 'Count of significant interactions',

      yaxis: {
        type: 'log',
        automargin: true,
      },
      margin: {
        b: 300,
      },
    });
  });

  constructor(
    private backend: BackendService,
    versionsService: VersionsService,
  ) {
    const version = versionsService.versionReadOnly();
    this.diseases = versionsService.diseases$();

    this.overallCounts = resource({
      request: version,
      loader: (param) => this.backend.getOverallCounts(param.request),
    });

    fromEvent(window, 'resize').subscribe(() => {
      const div = this.plotDiv$().nativeElement;
      if (div.checkVisibility()) {
        Plotly.Plots.resize(div);
      }
    });
  }

  ngOnDestroy() {
    Plotly.purge(this.plotDiv$().nativeElement);
    this.updatePlotEffect.destroy();
  }

  prepareData(counts: OverallCounts[] | undefined) {
    if (!counts) {
      return undefined;
    }

    const countField = 'count_interactions_sign';
    const aggregated = counts.reduce((acc, count) => {
      const disease = count.disease_name;
      if (!acc.has(disease)) {
        acc.set(disease, 0);
      }
      acc.set(disease, acc.get(disease)! + count[countField]);
      return acc;
    }, new Map<string, number>());

    const aggCounts = Array.from(aggregated.entries()).map(
      ([disease, count]) => ({
        disease,
        count,
      }),
    );
    const sortedCounts = aggCounts.sort((a, b) => b.count - a.count);

    return [
      {
        x: sortedCounts.map((c) => c.disease),
        y: sortedCounts.map((c) => c.count),
        type: 'bar',
      },
    ];
  }
}
