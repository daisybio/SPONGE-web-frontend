import {Component, computed, effect, ElementRef, model, signal, ViewChild} from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {BackendService} from "../../services/backend.service";
import {AsyncPipe, KeyValuePipe} from "@angular/common";
import {Gene} from "../../interfaces";
import _, {capitalize} from "lodash";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTabsModule} from "@angular/material/tabs";
import {MatSelect} from "@angular/material/select";
import {InteractionsTableComponent} from "../../components/interactions-table/interactions-table.component";

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
    AsyncPipe,
    MatCheckbox,
    MatTabsModule,
    MatSelect,
    KeyValuePipe,
    InteractionsTableComponent
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss'
})
export class GenesComponent {
  @ViewChild('pie') pie!: ElementRef;
  readonly currentInput = model('');
  readonly selectedDisease = model('');
  readonly activeGenes = signal<Gene[]>([]);
  readonly possibleGenes = computed(() => {
    return this.backend.getAutocomplete(this.currentInput().toLowerCase());
  });
  readonly onlySignificant = model(true);
  readonly results = computed(() => {
    const genes = this.activeGenes().map(g => g.ensg_number);
    const onlySignificant = this.onlySignificant();
    return this.backend.getGeneCount(genes, onlySignificant);
  })

  readonly diseaseCounts$ = computed(async () => {
    return (await this.results()).map(g => {
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

  readonly interactions$ = computed(async () => {
    const disease = this.selectedDisease();
    if (!disease) {
      return [];
    }
    const count = await this.diseaseCounts$().then(data => data[disease]);

    const n_requests = Math.ceil(count / 1000);
    const ensgs = this.activeGenes().map(g => g.ensg_number);

    return (await Promise.all([...Array(n_requests).keys()].map(async i => {
      return this.backend.getCeRNAInteractionsAll(disease, this.onlySignificant() ? 0.05 : 1, ensgs, 1000, i * 1000);
    }))).flat();
  });

  protected readonly capitalize = capitalize;

  constructor(private backend: BackendService) {
    effect(() => {
      this.diseaseCounts$().then(data => {
        if (Object.keys(data).length === 0) {
          return;
        }

        Plotly.newPlot(this.pie.nativeElement, [{
          values: Object.values(data),
          labels: Object.keys(data).map(capitalize),
          type: 'pie'
        }]);
      });
    });
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
}
