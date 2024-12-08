import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  model,
  ModelSignal,
  resource,
  Resource,
  Signal,
  signal,
  ViewChild
} from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {BackendService} from "../../services/backend.service";
import {CeRNAInteraction, Dataset, Gene, GeneCount} from "../../interfaces";
import _, {capitalize} from "lodash";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTabsModule} from "@angular/material/tabs";
import {MatSelect} from "@angular/material/select";
import {InteractionsTableComponent} from "../../components/interactions-table/interactions-table.component";
import {VersionsService} from "../../services/versions.service";
import {fromEvent, ReplaySubject} from "rxjs";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {toObservable} from "@angular/core/rxjs-interop";

declare const Plotly: any;

@Component({
  selector: 'app-genes',
  imports: [
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    FormsModule,
    MatAutocompleteModule,
    MatCheckbox,
    MatTabsModule,
    MatSelect,
    InteractionsTableComponent,
    MatProgressSpinner
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss'
})
export class GenesComponent implements AfterViewInit {
  @ViewChild('sunburst') pie!: ElementRef;
  readonly currentInput = model('');
  readonly selectedDisease = model('');
  readonly selectedSubtype: ModelSignal<Dataset | undefined> = model();
  readonly activeGenes = signal<Gene[]>([]);
  readonly diseaseSubtypeMap: Signal<Map<string, Dataset[]>>;
  readonly possibleGenes: Resource<Gene[]>;
  readonly onlySignificant = model(true);
  readonly results: Resource<GeneCount[]>;
  readonly isLoading: Signal<boolean>;

  readonly plotData: Signal<any>;

  readonly interactions$: Resource<CeRNAInteraction[]>;

  diseases = computed(() => {
    return this.results.value()?.map(r => r.sponge_run.dataset.disease_name).filter((v, i, a) => a.indexOf(v) === i) || [];
  });
  possibleSubtypes = computed(() => {
    return this.diseaseSubtypeMap().get(this.selectedDisease()) || [];
  });
  plotDataSubject = new ReplaySubject<any>();

  protected readonly capitalize = capitalize;

  constructor(backend: BackendService, versionsService: VersionsService) {
    const version = versionsService.versionReadOnly();
    this.diseaseSubtypeMap = versionsService.diseaseSubtypeMap();

    const autocompleteQuery = computed(() => {
      return {
        version: version(),
        query: this.currentInput().toLowerCase()
      }
    });

    effect(() => {
      const subtypes = this.possibleSubtypes();
      console.log(subtypes);
      if (subtypes.length >= 1) {
        this.selectedSubtype.set(subtypes[0]);
      }
    });

    effect(() => {
      const diseases = this.diseases();
      if (diseases.length >= 1) {
        this.selectedDisease.set(diseases[0]);
      }
    });

    this.possibleGenes = resource({
      request: autocompleteQuery,
      loader: async (param) => {
        return backend.getAutocomplete(param.request.version, param.request.query);
      }
    });

    const geneCountQuery = computed(() => {
      return {
        version: version(),
        ensgs: this.activeGenes().map(g => g.ensg_number),
        onlySignificant: this.onlySignificant()
      }
    });

    this.results = resource({
      request: geneCountQuery,
      loader: async (param) => {
        return backend.getGeneCount(param.request.version, param.request.ensgs, param.request.onlySignificant);
      }
    })

    this.plotData = computed(() => {
      return this.createSunburstData(this.results.value(), versionsService.diseases$().value());
    });

    toObservable(this.plotData).subscribe(data => {
      this.plotDataSubject.next(data);
    });

    this.isLoading = this.results.isLoading;

    const interactionsQuery = computed(() => {
      return {
        disease: this.selectedSubtype(),
        onlySignificant: this.onlySignificant(),
        ensgs: this.activeGenes().map(g => g.ensg_number),
        version: version()
      }
    });

    fromEvent(window, 'resize').subscribe(() => {
      if (!this.pie) {
        return;
      }
      Plotly.Plots.resize(this.pie.nativeElement);
    });

    this.interactions$ = resource({
      request: interactionsQuery,
      loader: async (param) => {
        const interactions: CeRNAInteraction[] = [];

        let data: CeRNAInteraction[];

        const limit = 1000;
        let offset = 0;

        do {
          data = await backend.getCeRNAInteractionsAll(
            param.request.version,
            param.request.disease,
            param.request.onlySignificant ? 0.05 : 1,
            param.request.ensgs,
            limit,
            offset
          );
          interactions.push(...data);
          offset += limit;
        } while (data.length === limit);

        return interactions;
      }
    })
  }

  remove(gene: Gene): void {
    this.activeGenes.update(genes => {
      return genes.filter(g => !_.isEqual(g, gene));
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.currentInput.set('');
    this.activeGenes.update(genes => [...genes, event.option.value]);
  }

  ngAfterViewInit(): void {
    this.plotDataSubject.subscribe((data) => {
      if (!data || data.labels.length === 1) {
        return;
      }
      Plotly.newPlot(this.pie.nativeElement, [data], {
        margin: {t: 0, l: 0, r: 0, b: 0},
        height: 900,
      });
      Plotly.Plots.resize(this.pie.nativeElement);
    });
  }

  private createSunburstData(results: GeneCount[] | undefined, datasets: Dataset[] | undefined) {
    if (!results || !datasets) {
      return;
    }
    const datasetCounts = results.reduce((acc, curr) => {
      if (!acc[curr.sponge_run.dataset.dataset_ID]) {
        acc[curr.sponge_run.dataset.dataset_ID] = {
          count: 0,
          dataset: datasets.find(d => d.dataset_ID === curr.sponge_run.dataset.dataset_ID)!
        };
      }
      acc[curr.sponge_run.dataset.dataset_ID].count += this.onlySignificant() ? curr.count_sign : curr.count_all;
      return acc;
    }, {} as { [key: string]: { count: number, dataset: Dataset } });

    const diseaseCounts = Object.values(datasetCounts).reduce((acc, curr) => {
      if (!acc[curr.dataset.disease_name]) {
        acc[curr.dataset.disease_name] = 0;
      }
      acc[curr.dataset.disease_name] += curr.count;
      return acc;
    }, {} as { [key: string]: number });

    const total = Object.values(diseaseCounts).reduce((acc, curr) => acc + curr, 0);

    const labels = ["Diseases"].concat(Object.keys(diseaseCounts).map(d => capitalize(d)));
    const values = [total].concat(Object.values(diseaseCounts));
    const parents = ["", ...Object.keys(diseaseCounts).map(d => "Diseases")];

    for (let datasetCount of Object.values(datasetCounts)) {
      const subtype = datasetCount.dataset.disease_subtype;

      if (!subtype) {
        continue;
      }

      const count = datasetCount.count;
      const dataset = datasetCount.dataset;
      const parent = capitalize(dataset.disease_name);

      labels.push(subtype);
      values.push(count);
      parents.push(parent);
    }

    return {
      labels,
      values,
      parents,
      type: 'sunburst'
    }
  }
}
