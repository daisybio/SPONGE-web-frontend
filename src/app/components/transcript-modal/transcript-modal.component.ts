import {
  AfterViewInit,
  Component,
  computed,
  effect,
  inject,
  model,
  resource,
  Signal,
  viewChild,
} from '@angular/core';
import {
  AlternativeSplicingEvent,
  Transcript,
  TranscriptInfoWithChromosome,
  TranscriptInteraction,
} from '../../interfaces';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { VersionsService } from '../../services/versions.service';
import { BackendService } from '../../services/backend.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BrowseService } from '../../services/browse.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { PredictService } from '../../routes/spongeffects/predict/service/predict.service';
import { MatTooltip } from '@angular/material/tooltip';
import { AS_DESCRIPTIONS, IGV_REFGENOME } from '../../constants';
import { ModalsService } from '../modals-service/modals.service';
import { Igv, Location } from '@visa-ge/ng-igv';
import { AsyncPipe } from '@angular/common';

import { InfoComponent } from '../info/info.component';
import { AddToCartButtonComponent } from '../add-to-cart-button/add-to-cart-button.component';

interface AsEventWithPsi extends AlternativeSplicingEvent {
  psi: Promise<number>;
}

@Component({
  selector: 'app-gene-modal',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatExpansionModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatProgressSpinner,
    MatProgressBar,
    MatTooltip,
    AsyncPipe,
    Igv,
    InfoComponent,
    AddToCartButtonComponent,
  ],
  templateUrl: './transcript-modal.component.html',
  styleUrl: './transcript-modal.component.scss',
})
export class TranscriptModalComponent implements AfterViewInit {
  readonly dialog = inject(MatDialog);
  paginator = viewChild.required(MatPaginator);
  columns = ['event_type', 'event_name', 'psi'];

  modalsService = inject(ModalsService);
  readonly browseService = inject(BrowseService);
  readonly asDescriptions = AS_DESCRIPTIONS;
  readonly transcript = inject<Transcript>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();
  readonly activeTab$ = model<number>(0);

  private router = inject(Router);
  private predictService = inject(PredictService, { optional: true });
  readonly isBrowseRoute$ = computed(() => this.router.url.includes('/browse'));

  get enstNumber(): string | undefined {
    const t = this.transcript as any;
    return t?.enst_number || t?.enst || t?.transcript?.enst_number;
  }

  // SpongEffects module for this transcript (best model run). Not filtered by disease: runs are
  // pancancer (disease is null on the runs), so a disease_name filter returns zero modules.
  readonly module_IDs$ = resource({
    params: computed(() => ({ version: this.version$(), enst: this.enstNumber })),
    loader: async (params) => {
      const { version, enst } = params.params;
      if (!enst) return [];
      return await this.backend.getSpongEffectsTranscriptModules(version, undefined, {}, undefined, enst);
    },
  });

  // Averaged TCGA enrichment scores (mean + variance) for the transcript's module(s).
  readonly tcgaEffects$ = resource({
    params: computed(() => ({
      version: this.version$(),
      module_ids: this.module_IDs$.value()?.map((m) => m.spongEffects_transcript_module_ID),
    })),
    loader: async (params) => {
      const { version, module_ids } = params.params;
      if (!module_ids || module_ids.length === 0) return [];
      return await this.backend.fetchSpongEffectsEnrichScores(version, 'transcript', module_ids, false, true);
    },
  });

  // Custom (uploaded-sample) enrichment scores for this transcript, when a transcript-level
  // prediction is active. Undefined otherwise (e.g. Explore / gene-level prediction).
  readonly customEffects$ = computed(() => {
    const scores = this.predictService?.activeScores$();
    if (!scores || !scores.genes || !scores.values) return undefined;
    const targetEnst = this.enstNumber?.toLowerCase();
    if (!targetEnst) return undefined;
    const idx = scores.genes.findIndex((entry: any) => {
      let str = '';
      if (typeof entry === 'string') str = entry.toLowerCase();
      else if (entry && typeof entry === 'object') str = (entry.enst_number || entry.transcript?.enst_number || '').toLowerCase();
      return str === targetEnst || str.includes(targetEnst);
    });
    if (idx === -1) return undefined;
    const vals = scores.values[idx] || [];
    if (vals.length === 0) return undefined;
    const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    const variance = vals.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / vals.length;
    return { mean, variance, count: vals.length };
  });

  formatScore(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    if (val === 0) return '0';
    const abs = Math.abs(val);
    if (abs < 0.001 || abs >= 10000) return val.toExponential(4);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  // Aggregate stats over the ceRNA interactions this transcript takes part in, read from the
  // network already loaded in BrowseService — the browse view filters edges by mscor / adj.
  // p-value, so the data is present without any extra request. Virtual/fallback edges (string
  // mscor like "< 0.2") are excluded so the summary reflects only real, measured interactions.
  // Undefined when no interactions are loaded (i.e. the modal was opened outside the browse network).
  readonly ceRNAStats$ = computed(() => {
    const enst = this.enstNumber;
    if (!enst) return undefined;
    const edges = this.browseService.interactions$() as TranscriptInteraction[];
    const real = edges.filter(
      (e) =>
        (e?.transcript_1?.enst_number === enst || e?.transcript_2?.enst_number === enst) &&
        typeof e.mscor === 'number' &&
        typeof e.p_value === 'number'
    );
    if (real.length === 0) return undefined;
    const mscors = real.map((e) => e.mscor).sort((a, b) => a - b);
    const pValues = real.map((e) => e.p_value);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const median = (sorted: number[]) => {
      const n = sorted.length;
      const mid = Math.floor(n / 2);
      return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    return {
      count: real.length,
      meanMscor: sum(mscors) / mscors.length,
      medianMscor: median(mscors),
      minMscor: mscors[0],
      maxMscor: mscors[mscors.length - 1],
      bestPValue: Math.min(...pValues),
    };
  });

  readonly effectiveCentralities$ = computed(() => {
    const t = this.transcript as any;
    if (t.betweenness !== undefined && t.betweenness !== null) {
      return {
        betweenness: t.betweenness,
        eigenvector: t.eigenvector ?? null,
        node_degree: t.node_degree ?? null,
      };
    }

    const enst = this.transcript.enst_number;
    const activeNodes = this.browseService.nodes$() || [];
    const match = activeNodes.find((n) => BrowseService.getNodeID(n) === enst);
    if (match) {
      return {
        betweenness: match.betweenness ?? null,
        eigenvector: match.eigenvector ?? null,
        node_degree: match.node_degree ?? null,
      };
    }

    return {
      betweenness: t.betweenness ?? null,
      eigenvector: t.eigenvector ?? null,
      node_degree: t.node_degree ?? null,
    };
  });

  readonly isFallback = computed(() => {
    const c = this.effectiveCentralities$();
    return c.betweenness === null || c.betweenness === undefined || c.node_degree === null || c.node_degree === undefined;
  });
  asDatasource = new MatTableDataSource<AlternativeSplicingEvent>();

  miRNAtracks$ = this.browseService.getMiRNATracksForNode(this.transcript);
  readonly transcriptInfo$ = resource({
    params: this.version$,
    loader: async (version) => {
      const transcriptInfoPromise = this.backend
        .getTranscriptInfo(version.params, this.transcript.enst_number)
        .then((info) => info[0]);

      const geneInfoPromise = this.backend
        .getGeneInfo(version.params, this.transcript.gene.ensg_number)
        .then((info) => info[0]);

      const [transcriptInfo, geneInfo] = await Promise.all([
        transcriptInfoPromise,
        geneInfoPromise,
      ]);

      return {
        ...transcriptInfo,
        chromosome_name: geneInfo.chromosome_name,
      } as TranscriptInfoWithChromosome;
    },
  });
  isCanonical$ = computed(() => {
    const info = this.transcriptInfo$.value();
    if (info === undefined) return 'Unknown';
    if (info.canonical_transcript === 0) {
      return 'No';
    } else if (info.canonical_transcript === 1) {
      return 'Yes';
    } else {
      return 'Unknown';
    }
  });

  readonly diggerInfo$ = resource({
    params: () => this.transcript.enst_number,
    loader: async (param) =>
      this.backend.checkDigger(param.params, 'transcript'),
  });

  alternativeSplicingEvents = resource({
    loader: async() => {
      const asEvents = await this.backend.getAlternativeSplicingEvents([
        this.transcript.enst_number,
      ]);

      return asEvents.map((event) => ({
        ...event,
        psi: this.getEventPsi(event.alternative_splicing_event_transcripts_ID),
      })) as AsEventWithPsi[];
    },
  });

  async getEventPsi(eventId: number) {
    const disease = this.browseService.disease$();
    if (!disease) {
      return 0;
    }
    return this.backend.getASPsiValues(this.version$(), eventId, this.transcript.enst_number, disease).then((values) => {
      if (values.length === 0) {
        return 0;
      }
      return values.reduce((acc, value) => acc + value.psi_value, 0) / values.length;
    });
  }

  hasAsEvents$ = computed(() => {
    return (this.alternativeSplicingEvents.value() || []).length > 0;
  });
  readonly location$: Signal<Location> = computed(() => {
    const transcriptInfo = this.transcriptInfo$.value();
    if (!transcriptInfo) {
      return {
        chr: 'all',
      };
    } else {
      return {
        chr: transcriptInfo.chromosome_name,
        range: {
          start: transcriptInfo.start_pos,
          end: transcriptInfo.end_pos,
        },
      };
    }
  });
  protected readonly BrowseService = BrowseService;
  protected readonly IGV_REFGENOME = IGV_REFGENOME;

  constructor() {
    effect(() => {
      this.asDatasource.data = this.alternativeSplicingEvents.value() || [];
    });
  }

  showGene() {
    this.modalsService.openNodeDialog(this.transcript.gene);
  }

  ngAfterViewInit(): void {
    this.asDatasource.paginator = this.paginator();
  }
}
