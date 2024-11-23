import {Component, computed, model, signal} from '@angular/core';
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
    MatCheckbox
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss'
})
export class GenesComponent {
  readonly currentInput = model('');
  readonly activeGenes = signal<Gene[]>([]);
  readonly possibleGenes = computed(() => {
    return this.backend.getAutocomplete(this.currentInput().toLowerCase());
  });
  readonly onlySignificant = model(true);

  constructor(private backend: BackendService) {
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
