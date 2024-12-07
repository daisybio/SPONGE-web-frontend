import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  model,
  resource,
  Resource,
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
import {KeyValuePipe} from "@angular/common";
import {CeRNAInteraction, Gene, GeneCount} from "../../interfaces";
import _, {capitalize} from "lodash";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTabsModule} from "@angular/material/tabs";
import {MatSelect} from "@angular/material/select";
import {InteractionsTableComponent} from "../../components/interactions-table/interactions-table.component";
import {VersionsService} from "../../services/versions.service";

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
    KeyValuePipe,
    InteractionsTableComponent
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss'
})
export class GenesComponent implements AfterViewInit {
  @ViewChild('pie') pie!: ElementRef;
  readonly currentInput = model('');
  readonly selectedDisease = model('');
  readonly activeGenes = signal<Gene[]>([]);
  readonly possibleGenes: Resource<Gene[]>;
  readonly onlySignificant = model(true);
  readonly results: Resource<GeneCount[]>;

  readonly diseaseCounts$ = computed(() => {
    return this.results.value()?.map(g => {
      return {
        disease_name: g.sponge_run.dataset.disease_name,
        count: this.onlySignificant() ? g.count_sign : g.count_all
      }
    }).reduce((acc, curr) => {
      if (!acc[curr.disease_name]) {
        acc[curr.disease_name] = 0;
      }
      acc[curr.disease_name] += curr.count;
      return acc;
    }, {} as { [key: string]: number });
  })

  readonly interactions$: Resource<CeRNAInteraction[]>;

  protected readonly capitalize = capitalize;

  constructor(backend: BackendService, versionsService: VersionsService) {
    const version = versionsService.versionReadOnly();

    const autocompleteQuery = computed(() => {
      return {
        version: version(),
        query: this.currentInput().toLowerCase()
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

    const interactionsQuery = computed(() => {
      return {
        disease: this.selectedDisease(),
        onlySignificant: this.onlySignificant(),
        ensgs: this.activeGenes().map(g => g.ensg_number),
        version: version()
      }
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
        } while (data.length > 0);

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
    effect(() => {
      const data = this.diseaseCounts$();
      if (!data || Object.keys(data).length === 0) {
        return;
      }

      Plotly.newPlot(this.pie.nativeElement, [{
        values: Object.values(data),
        labels: Object.keys(data).map(capitalize),
        type: 'pie'
      }]);
    });
  }
}
