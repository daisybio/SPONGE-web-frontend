import {
  AfterViewInit,
  Component,
  computed,
  effect,
  inject,
  model,
  resource,
  ResourceRef,
  Signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Gene, GeneInteraction, GOTerm, SpongEffectsGeneModules } from '../../interfaces';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
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
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AS_DESCRIPTIONS, IGV_REFGENOME } from '../../constants';
import { MatTooltip } from '@angular/material/tooltip';
import { Igv, Location } from '@visa-ge/ng-igv';
import { ModalsService } from '../modals-service/modals.service';
import { BrowseService } from '../../services/browse.service';
import { Router } from '@angular/router';
import { PredictService } from '../../routes/spongeffects/predict/service/predict.service';
import { InfoComponent } from '../info/info.component';
import { AddToCartButtonComponent } from '../add-to-cart-button/add-to-cart-button.component';

interface ASEntry {
  enst: string;
  events: string[];
}

@Component({
  selector: 'app-gene-modal',
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatExpansionModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatChipSet,
    MatChip,
    MatProgressSpinner,
    MatProgressBar,
    MatTooltip,
    Igv,
    InfoComponent,
  ],
  templateUrl: './gene-modal.component.html',
  styleUrl: './gene-modal.component.scss',
})
export class GeneModalComponent implements AfterViewInit {
  goPaginator = viewChild<MatPaginator>('goPaginator');
  asPaginator = viewChild<MatPaginator>('asPaginator');
  goColumns = ['symbol', 'description'];
  asColumns = ['enst', 'events'];
  goFilter = model<string>('');
  readonly asDescriptions = AS_DESCRIPTIONS;
  modalsService = inject(ModalsService);

  browseService = inject(BrowseService);
  private router = inject(Router);
  readonly isBrowseRoute$ = computed(() => this.router.url.includes('/browse'));
  readonly disease$ = this.browseService.disease$;
  readonly gene = inject<Gene>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();
  readonly isOpeningTranscript = model<boolean>(false);
  readonly activeTab$ = model<number>(0);

  goDatasource = new MatTableDataSource<GOTerm>();
  asDatasource = new MatTableDataSource<ASEntry>();

  miRNAtracks$ = this.browseService.getMiRNATracksForNode(this.gene);

  get ensgNumber(): string | undefined {
    const g = this.gene as any;
    return g?.ensg_number || g?.ensg || g?.gene?.ensg_number || g?.transcript?.gene?.ensg_number;
  }

  get geneSymbol(): string | undefined {
    const g = this.gene as any;
    const raw = g?.gene_symbol || g?.symbol || g?.gene?.gene_symbol || g?.transcript?.gene?.gene_symbol;
    if (!raw) return undefined;
    return raw.split(' ')[0].trim();
  }

  private predictService = inject(PredictService, { optional: true });

  readonly module_IDs$: ResourceRef<SpongEffectsGeneModules[] | undefined> = resource({
    params: computed(() => {
      const version = this.version$();
      const ensg = this.ensgNumber;
      return { version, ensg };
    }),
    loader: async (params) => {
      const { version, ensg } = params.params;
      if (!ensg) return [];
      // Do NOT filter by disease: SpongEffects runs are pancancer (disease is null on the runs),
      // so any disease_name filter returns zero modules. get_best returns the gene's best module.
      return await this.backend.getSpongEffectsGeneModules(
        version,
        undefined,
        {},
        undefined,
        ensg,
        true
      );
    }
  });

  readonly tcgaEffects$ = resource({
    params: computed(() => {
      const version = this.version$();
      const module_ids = this.module_IDs$.value()?.map((module) => module.spongEffects_gene_module_ID);
      return { version, module_ids };
    }),
    loader: async (params) => {
      if (!params.params.module_ids || params.params.module_ids.length === 0) return [];
      return await this.backend.fetchSpongEffectsEnrichScores(params.params.version, "gene", params.params.module_ids, false, true);
    }
  });

  readonly customEffects$ = computed(() => {
    const g = this.gene as any;
    if (g?.custom_mean !== undefined && g?.custom_mean !== null) {
      return {
        mean: g.custom_mean,
        variance: g.custom_variance ?? null,
        count: g.custom_count ?? 1,
      };
    }

    const scores = this.predictService?.activeScores$();
    if (!scores || !scores.genes || !scores.values) return undefined;
    const targetSymbol = this.geneSymbol?.toLowerCase();
    const targetEnsg = this.ensgNumber?.toLowerCase();
    if (!targetSymbol && !targetEnsg) return undefined;

    const idx = scores.genes.findIndex((entry: any) => {
      if (!entry) return false;
      let str = '';
      if (typeof entry === 'string') {
        str = entry.toLowerCase();
      } else if (typeof entry === 'object') {
        str = (entry.gene_symbol || entry.symbol || entry.ensg_number || entry.ensg || entry.gene?.gene_symbol || entry.gene?.ensg_number || '').toLowerCase();
      }
      return (targetSymbol && (str === targetSymbol || str.includes(targetSymbol))) ||
             (targetEnsg && (str === targetEnsg || str.includes(targetEnsg)));
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
    if (abs < 0.001 || abs >= 10000) {
      return val.toExponential(4);
    }
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  // Aggregate stats over the ceRNA interactions this gene takes part in, read from the network
  // already loaded in BrowseService — the browse view filters edges by mscor / adj. p-value, so
  // the data is present without any extra request. Virtual/fallback edges (string mscor like
  // "< 0.2") are excluded so the summary reflects only real, measured interactions. Undefined when
  // no interactions for this gene are loaded (i.e. the modal was opened outside the browse network).
  readonly ceRNAStats$ = computed(() => {
    const ensg = this.ensgNumber;
    if (!ensg) return undefined;
    const edges = this.browseService.interactions$() as GeneInteraction[];
    const real = edges.filter(
      (e) =>
        (e?.gene1?.ensg_number === ensg || e?.gene2?.ensg_number === ensg) &&
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
    const g = this.gene as any;
    if (g.betweenness !== undefined && g.betweenness !== null) {
      return {
        betweenness: g.betweenness,
        eigenvector: g.eigenvector ?? null,
        node_degree: g.node_degree ?? null,
      };
    }

    const ensg = this.ensgNumber;
    const activeNodes = this.browseService.nodes$() || [];
    const match = activeNodes.find((n) => BrowseService.getNodeID(n) === ensg);
    if (match) {
      return {
        betweenness: match.betweenness ?? null,
        eigenvector: match.eigenvector ?? null,
        node_degree: match.node_degree ?? null,
      };
    }

    return {
      betweenness: g.betweenness ?? null,
      eigenvector: g.eigenvector ?? null,
      node_degree: g.node_degree ?? null,
    };
  });

  readonly geneInfo$ = resource({
    params: this.version$,
    loader: async (version) =>
      this.geneEnsgNumber
        ? this.backend
            .getGeneInfo(version.params, this.geneEnsgNumber)
            .then((info) => info[0])
        : undefined,
  });

  readonly goTerms$ = resource({
    params: this.version$,
    loader: async (version) =>
      this.geneSymbol ? this.backend.getGOterms(version.params, this.geneSymbol) : [],
  });

  readonly hallmarks$ = resource({
    params: this.version$,
    loader: async (version) =>
      this.geneSymbol ? this.backend.getHallmark(version.params, this.geneSymbol) : [],
  });

  readonly wikipathways$ = resource({
    params: this.version$,
    loader: async (version) =>
      this.geneSymbol ? this.backend.getWikiPathways(version.params, this.geneSymbol) : [],
  });

  get geneEnsgNumber(): string | undefined {
    return this.ensgNumber;
  }

  readonly transcripts$: ResourceRef<ASEntry[] | undefined> = resource({
    params: this.version$,
    loader: async (version) => {
      const transcripts = await this.backend.getGeneTranscripts(
        version.params,
        this.gene.ensg_number,
      );
      const asEvents =
        await this.backend.getAlternativeSplicingEvents(transcripts);
      const transcriptEvents = asEvents.reduce((acc, event) => {
        const enst = event.transcript.enst_number;
        if (!acc.has(enst)) {
          acc.set(enst, new Set<string>());
        }
        acc.get(enst)!.add(event.event_type);
        return acc;
      }, new Map<string, Set<string>>());

      return transcripts.map((t) => ({
        enst: t,
        events: Array.from(transcriptEvents.get(t) ?? []),
      }));
    },
  });

  readonly location$: Signal<Location> = computed(() => {
    const geneInfo = this.geneInfo$.value();
    if (!geneInfo) {
      return {
        chr: 'all',
      };
    } else {
      return {
        chr: geneInfo.chromosome_name,
        range: {
          start: geneInfo.start_pos,
          end: geneInfo.end_pos,
        },
      };
    }
  });
  protected readonly IGV_REFGENOME = IGV_REFGENOME;

  constructor() {
    effect(() => {
      this.goDatasource.data = this.goTerms$.value() ?? [];
    });

    effect(() => {
      this.goDatasource.filter = this.goFilter().trim().toLowerCase();
    });

    effect(() => {
      this.asDatasource.data = this.transcripts$.value() ?? [];
    });

    effect(() => {
      const p = this.goPaginator();
      if (p) this.goDatasource.paginator = p;
    });

    effect(() => {
      const p = this.asPaginator();
      if (p) this.asDatasource.paginator = p;
    });
  }

  ngAfterViewInit(): void {}

  async openTranscript(enst: string) {
    if (this.isOpeningTranscript()) return;
    this.isOpeningTranscript.set(true);
    const transcript = (
      await this.backend.getTranscriptInfo(this.version$(), enst)
    )[0];
    this.modalsService.openNodeDialog(transcript);
    this.isOpeningTranscript.set(false);
  }
}
