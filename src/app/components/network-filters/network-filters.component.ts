import { Component, ElementRef, WritableSignal, computed, effect, inject, input, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { InfoComponent } from '../info/info.component';
import { InfoService } from '../../services/info.service';
import { VersionsService } from '../../services/versions.service';
import { BrowseService } from '../../services/browse.service';
import { getGeneTypesForDisease, formatGeneType } from '../../utils/gene-types';

/**
 * The set of network-filter signals the shared drawer binds to. Both PredictService and
 * ExploreService expose exactly these (structural match), so the same <app-network-filters>
 * drawer drives the patient-specific and the reference (Explore) networks.
 */
export interface NetworkFilterSignals {
  showOrphans$: WritableSignal<boolean>;
  sortingBetweenness$: WritableSignal<boolean>;
  sortingEigenvector$: WritableSignal<boolean>;
  sortingDegree$: WritableSignal<boolean>;
  maxNodes$: WritableSignal<number>;
  minDegree$: WritableSignal<number>;
  minBetweenness$: WritableSignal<number>;
  minEigen$: WritableSignal<number>;
  geneType$: WritableSignal<string>;
  supportFilter$: WritableSignal<'all' | 'has_inverse' | 'no_inverse'>;
  interactionSorting$: WritableSignal<string>;
  maxInteractions$: WritableSignal<number>;
  maxPValue$: WritableSignal<number>;
  minMscor$: WritableSignal<number>;
}

/**
 * Shared "Nodes" + "Interactions" filter panels used by the SpongEffects Scores drawer and the
 * Explore drawer. It reads/writes the caller's own signals through the NetworkFilterSignals input,
 * so each view keeps its own state and service while the markup stays in one place.
 */
@Component({
  selector: 'app-network-filters',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatCardModule,
    InfoComponent,
  ],
  templateUrl: './network-filters.component.html',
})
export class NetworkFiltersComponent {
  /** The caller's network-filter signals (PredictService or ExploreService). */
  filters = input.required<NetworkFilterSignals>();
  /** The network service whose nodes drive the available gene-type options. */
  browseService = input.required<BrowseService>();
  /** Disease/scope name used to scope the available gene types. */
  disease = input<string | undefined>();

  infoService = inject(InfoService);
  private versionsService = inject(VersionsService);

  protected readonly formatGeneType = formatGeneType;
  mscorEquation$ = viewChild<ElementRef<HTMLSpanElement>>('mscorEquation');

  readonly availableGeneTypes = computed(() => {
    const disease = this.disease();
    const version = this.versionsService.versionReadOnly()();
    const nodes = this.browseService().nodes$() || [];
    const nodeTypes = nodes.map((n: any) => {
      if ('gene' in n && n.gene?.gene_type) return n.gene.gene_type;
      if ('transcript' in n && n.transcript?.transcript_type) return n.transcript.transcript_type;
      if ('transcript' in n && n.transcript?.gene?.gene_type) return n.transcript.gene.gene_type;
      return '';
    }).filter(Boolean);
    return getGeneTypesForDisease(disease, version, nodeTypes);
  });

  constructor() {
    // Reset the gene-type filter to "all" whenever the current selection is no longer available.
    effect(() => {
      const types = this.availableGeneTypes();
      const filters = this.filters();
      const current = filters.geneType$();
      if (current && current !== 'all' && !types.includes(current)) {
        filters.geneType$.set('all');
      }
    });

    // Render the KaTeX mscor equation once the info dialog projects the target span.
    effect(() => {
      this.infoService.renderMscorEquation(this.mscorEquation$()!);
    });
  }

  updateNumberSignal(sig: WritableSignal<number>, val: number, defaultVal: number) {
    sig.set(isNaN(val) ? defaultVal : val);
  }
}
