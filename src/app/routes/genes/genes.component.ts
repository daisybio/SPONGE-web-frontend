import {
  Component,
  computed,
  inject,
  model,
  resource,
  signal,
} from '@angular/core';
import {
  MatDrawer,
  MatDrawerContainer,
  MatDrawerContent,
} from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { BackendService } from '../../services/backend.service';
import { Dataset, Gene } from '../../interfaces';
import _, { capitalize } from 'lodash';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { InteractionsTableComponent } from '../../components/interactions-table/interactions-table.component';
import { VersionsService } from '../../services/versions.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SunburstComponent } from './sunburst/sunburst.component';
import { DiseaseSelectorComponent } from '../../components/disease-selector/disease-selector.component';

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
    InteractionsTableComponent,
    MatProgressSpinner,
    SunburstComponent,
    DiseaseSelectorComponent,
  ],
  templateUrl: './genes.component.html',
  styleUrl: './genes.component.scss',
})
export class GenesComponent {
  readonly backend = inject(BackendService);
  readonly versionsService = inject(VersionsService);

  readonly version = this.versionsService.versionReadOnly();
  readonly tabChange = signal<number>(0);

  readonly currentInput = model<string | Gene>('');
  readonly onlySignificant = model(true);

  readonly activeGenes = signal<Gene[]>([]);
  readonly activeDisease = signal<Dataset | undefined>(undefined);

  readonly possibleGenes = resource({
    request: computed(() => {
      const currentInput = this.currentInput();

      let query = '';
      if (typeof currentInput === 'string') {
        query = currentInput;
      } else {
        query = '';
      }

      return {
        version: this.version(),
        query,
      };
    }),
    loader: async (param) => {
      return this.backend.getAutocomplete(
        param.request.version,
        param.request.query
      );
    },
  });
  readonly results = resource({
    request: computed(() => {
      return {
        version: this.version(),
        ensgs: this.activeGenes().map((g) => g.ensg_number),
        onlySignificant: this.onlySignificant(),
      };
    }),
    loader: async (param) => {
      return this.backend.getGeneCount(
        param.request.version,
        param.request.ensgs,
        param.request.onlySignificant
      );
    },
  });

  readonly interactions$ = resource({
    request: computed(() => {
      return {
        disease: this.activeDisease(),
        onlySignificant: this.onlySignificant(),
        ensgs: this.activeGenes().map((g) => g.ensg_number),
        version: this.version(),
      };
    }),
    loader: async (param) => {
      return this.backend.getGeneInteractionsAll(
        param.request.version,
        param.request.disease,
        param.request.onlySignificant ? 0.05 : 1,
        param.request.ensgs
      );
    },
  });

  diseases$ = computed(() => {
    const results = this.results.value() ?? [];
    console.log(results);
    const datasetIDs =
      results
        .map((r) => r.sponge_run.dataset.dataset_ID)
        .filter((v, i, a) => a.indexOf(v) === i) ?? [];
    const diseases = this.versionsService.diseases$().value() ?? [];
    return datasetIDs
      .map((id) => diseases.find((el) => el.dataset_ID === id))
      .filter((el) => el !== undefined);
  });

  protected readonly capitalize = capitalize;

  remove(gene: Gene): void {
    this.activeGenes.update((genes) => {
      return genes.filter((g) => !_.isEqual(g, gene));
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.activeGenes.update((genes) => [...genes, event.option.value]);
  }
}
