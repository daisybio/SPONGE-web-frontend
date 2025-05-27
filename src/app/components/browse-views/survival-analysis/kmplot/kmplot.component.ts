import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnInit,
  resource,
  ResourceRef,
  viewChild,
  ViewChild,
} from '@angular/core';
import { Dataset, Gene, GeneNode, SurvivalRate } from '../../../../interfaces';
import { BackendService } from '../../../../services/backend.service';
import { MatCardModule } from '@angular/material/card';
import { compute } from '@fullstax/kaplan-meier-estimator';
import { VersionsService } from '../../../../services/versions.service';
import { ReplaySubject } from 'rxjs';
import { MatProgressBar } from '@angular/material/progress-bar';

declare const Plotly: any;

interface CombinedPlotData {
  overexpressed: any;
  underexpressed: any;
  pValue: number;
  gene: Gene;
  disease: Dataset;
}

@Component({
  selector: 'app-kmplot',
  imports: [MatCardModule, MatProgressBar],
  templateUrl: './kmplot.component.html',
  styleUrl: './kmplot.component.scss',
})
export class KMPlotComponent {
  gene = input.required<GeneNode>();
  disease = input.required<Dataset>();
  plot = viewChild<ElementRef<HTMLDivElement>>('plot');
  refresh$ = input<any>(0, { alias: 'refresh' });

  plotDataResource: ResourceRef<CombinedPlotData | undefined>;

  constructor(
    private backend: BackendService,
    versionsService: VersionsService
  ) {
    this.plotDataResource = resource({
      request: computed(() => {
        return {
          gene: this.gene().gene,
          disease: this.disease(),
          version: versionsService.versionReadOnly()(),
        };
      }),
      loader: async (param) => {
        const pVals$ = this.backend.getSurvivalPValues(
          param.request.version,
          [param.request.gene.ensg_number],
          param.request.disease
        );
        const surivialRates$ = this.backend.getSurvivalRates(
          param.request.version,
          [param.request.gene.ensg_number],
          param.request.disease
        );

        const [pVals, survivalRates] = await Promise.all([
          pVals$,
          surivialRates$,
        ]);

        if (pVals.length === 0) {
          return undefined;
        }

        const pValue = pVals[0].pValue;

        const overExpressed = survivalRates.filter(
          (rate) => rate.overexpression === 1
        );
        const underExpressed = survivalRates.filter(
          (rate) => rate.overexpression === 0
        );

        return {
          overexpressed: this.getPlotData(overExpressed, 'Overexpressed'),
          underexpressed: this.getPlotData(underExpressed, 'Underexpressed'),
          pValue,
          gene: param.request.gene,
          disease: param.request.disease,
        };
      },
    });

    effect(() => {
      this.refresh$();
      this.refresh();
    });

    effect(() => {
      const data = this.plotDataResource.value();
      const div = this.plot()?.nativeElement;

      if (!data || !div) return;

      const pValue = data.pValue;

      Plotly.newPlot(div, [data.overexpressed, data.underexpressed], {
        title: `Survival Analysis for ${this.getGenePrimary(data.gene)} in ${
          data.disease.disease_name
        }<br>P-value: ${pValue}`,
        xaxis: {
          title: 'Time (days)',
        },
        yaxis: {
          title: 'Survival Rate',
        },
      });
    });
  }

  getGenePrimary(gene: Gene): string {
    return gene.gene_symbol || gene.ensg_number;
  }

  getPlotData(rates: SurvivalRate[], name: string) {
    const sortedRates = rates.sort(
      (a, b) =>
        a.patient_information.survival_time -
        b.patient_information.survival_time
    );
    const times = sortedRates.map(
      (rate) => rate.patient_information.survival_time
    );
    const events = sortedRates.map(
      (rate) => rate.patient_information.disease_status === 0
    );
    const result = compute(times, events);
    return {
      x: result.map((point) => point.time),
      y: result.map((point) => point.rate),
      type: 'scatter',
      name,
    };
  }

  refresh() {
    const plot = this.plot()?.nativeElement;
    if (plot && plot.checkVisibility()) {
      Plotly.Plots.resize(plot);
    }
  }
}
