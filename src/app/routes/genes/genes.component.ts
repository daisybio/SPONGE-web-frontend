import {Component, computed, effect, inject, model, ModelSignal, resource, signal} from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {BackendService} from "../../services/backend.service";
import {Dataset, Gene} from "../../interfaces";
import _, {capitalize} from "lodash";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatTabsModule} from "@angular/material/tabs";
import {MatSelect} from "@angular/material/select";
import {InteractionsTableComponent} from "../../components/interactions-table/interactions-table.component";
import {VersionsService} from "../../services/versions.service";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {SunburstComponent} from "./sunburst/sunburst.component";

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
    MatProgressSpinner,
    SunburstComponent
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss'
})
export class GenesComponent {
  readonly backend = inject(BackendService);
  readonly versionsService = inject(VersionsService);

  readonly version = this.versionsService.versionReadOnly();
  readonly diseaseSubtypeMap = this.versionsService.diseaseSubtypeMap();

  readonly currentInput = model('');
  readonly selectedDisease = model('');
  readonly selectedSubtype: ModelSignal<Dataset | undefined> = model();

  readonly activeGenes = signal<Gene[]>([]);

  readonly possibleGenes = resource({
    request: computed(() => {
      return {
        version: this.version(),
        query: this.currentInput().toLowerCase()
      }
    }),
    loader: async (param) => {
      return this.backend.getAutocomplete(param.request.version, param.request.query);
    }
  });
  readonly onlySignificant = model(true);
  readonly results = resource({
    request: computed(() => {
      return {
        version: this.version(),
        ensgs: this.activeGenes().map(g => g.ensg_number),
        onlySignificant: this.onlySignificant()
      }
    }),
    loader: async (param) => {
      return this.backend.getGeneCount(param.request.version, param.request.ensgs, param.request.onlySignificant);
    }
  })

  readonly interactions$ = resource({
    request: computed(() => {
      return {
        disease: this.selectedSubtype(),
        onlySignificant: this.onlySignificant(),
        ensgs: this.activeGenes().map(g => g.ensg_number),
        version: this.version()
      }
    }),
    loader: async (param) => {
      return this.backend.getCeRNAInteractionsAll(
        param.request.version,
        param.request.disease,
        param.request.onlySignificant ? 0.05 : 1,
        param.request.ensgs
      );
    }
  })

  diseases = computed(() => {
    return this.results.value()?.map(r => r.sponge_run.dataset.disease_name).filter((v, i, a) => a.indexOf(v) === i) || [];
  });
  possibleSubtypes = computed(() => {
    return this.diseaseSubtypeMap().get(this.selectedDisease()) || [];
  });

  protected readonly capitalize = capitalize;

  constructor() {
    effect(() => {
      const subtypes = this.possibleSubtypes();
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
  }

  remove(gene: Gene): void {
    this.activeGenes.update(genes => {
      return genes.filter(g => !_.isEqual(g, gene));
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.activeGenes.update(genes => [...genes, event.option.value]);
  }
}
