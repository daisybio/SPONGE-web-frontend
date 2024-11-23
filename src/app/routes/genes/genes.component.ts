import {Component, computed, effect, ElementRef, model, signal, ViewChild} from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {BackendService} from "../../services/backend.service";
import {AsyncPipe} from "@angular/common";
import {Gene} from "../../interfaces";
import _ from "lodash";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTab, MatTabGroup} from "@angular/material/tabs";

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
    MatTabGroup,
    MatTab
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss'
})
export class GenesComponent {
  @ViewChild('pie') pie!: ElementRef;
  readonly currentInput = model('');
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

  readonly pieData$ = computed(async () => {
    const geneCounts = await this.results();
    const diseaseCount = geneCounts.map(g => {
      return {
        disease_name: g.run.dataset.disease_name,
        count_sign: g.count_sign
      }
    }).reduce((acc, curr) => {
      if (!acc[curr.disease_name]) {
        acc[curr.disease_name] = 0;
      }
      acc[curr.disease_name] += curr.count_sign;
      return acc;
    }, {} as { [key: string]: number });

    return {
      values: Object.values(diseaseCount),
      labels: Object.keys(diseaseCount),
      type: 'pie'
    }
  })

  constructor(private backend: BackendService) {
    effect(() => {
      this.pieData$().then(data => {
        console.log(data);

        if (data.labels.length === 0) {
          return;
        }

        Plotly.newPlot(this.pie.nativeElement, [data]);
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
