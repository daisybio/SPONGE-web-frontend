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
import { Gene, GOTerm } from '../../interfaces';
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
import { Igv, Location, Track } from '@visa-ge/ng-igv';
import { ModalsService } from '../modals-service/modals.service';
import { BrowseService } from '../../services/browse.service';

interface ASEntry {
  enst: string;
  events: string[];
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
    MatChipSet,
    MatChip,
    MatProgressSpinner,
    MatTooltip,
    Igv,
  ],
  templateUrl: './gene-modal.component.html',
  styleUrl: './gene-modal.component.scss',
})
export class GeneModalComponent implements AfterViewInit {
  goPaginator = viewChild.required<MatPaginator>('goPaginator');
  asPaginator = viewChild.required<MatPaginator>('asPaginator');
  goColumns = ['symbol', 'description'];
  asColumns = ['enst', 'events'];
  goFilter = model<string>('');
  readonly asDescriptions = AS_DESCRIPTIONS;
  modalsService = inject(ModalsService);

  browseService = inject(BrowseService);
  readonly disease$ = this.browseService.disease$;
  readonly gene = inject<Gene>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();
  readonly isOpeningTranscript = model<boolean>(false);
  readonly activeTab$ = model<number>(0);

  goDatasource = new MatTableDataSource<GOTerm>();
  asDatasource = new MatTableDataSource<ASEntry>();

  edges$ = this.browseService.getEdgesForNode(this.gene);
  miRNAs$ = resource({
    request: computed(() => {
      return {
        edges: this.edges$(),
        disease: this.disease$(),
        version: this.version$(),
      };
    }),
    loader: async (param) => {
      const edges = param.request.edges;
      const disease = param.request.disease;
      const version = param.request.version;
      if (!disease) {
        return Promise.resolve([]);
      }
      const miRNAs$ = edges.map((edge) =>
        this.backend
          .getMiRNAs(
            version,
            disease,
            BrowseService.getInteractionIDs(edge),
            'gene',
          )
          .then((res) => res.map((mirna) => mirna.mirna.hs_nr)),
      );
      return (await Promise.all(miRNAs$))
        .flat()
        .filter((miRNA, i, arr) => arr.indexOf(miRNA) === i);
    },
  });

  miRNAtracks$ = computed((): Track[] => {
    const miRNAs = this.miRNAs$.value();
    if (!miRNAs) {
      return [];
    }
    return miRNAs.map((miRNA) => {
      return {
        name: miRNA,
        url: `https://exbio.wzw.tum.de/sponge-files/miRNA_bed_files/${miRNA}.bed.gz`,
        format: 'bed',
        type: 'annotation',
        height: 30,
        displayMode: 'SQUISHED',
        indexed: false,
      };
    });
  });

  readonly geneInfo$ = resource({
    request: this.version$,
    loader: async (version) =>
      this.backend
        .getGeneInfo(version.request, this.gene.ensg_number)
        .then((info) => info[0]),
  });

  readonly goTerms$ = resource({
    request: this.version$,
    loader: async (version) =>
      this.backend.getGOterms(version.request, this.gene.gene_symbol),
  });

  readonly hallmarks$ = resource({
    request: this.version$,
    loader: async (version) =>
      this.backend.getHallmark(version.request, this.gene.gene_symbol),
  });

  readonly wikipathways$ = resource({
    request: this.version$,
    loader: async (version) =>
      this.backend.getWikiPathways(version.request, this.gene.gene_symbol),
  });

  readonly transcripts$: ResourceRef<ASEntry[]> = resource({
    request: this.version$,
    loader: async (version) => {
      const transcripts = await this.backend.getGeneTranscripts(
        version.request,
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
  }

  ngAfterViewInit(): void {
    this.goDatasource.paginator = this.goPaginator();
    this.asDatasource.paginator = this.asPaginator();
  }

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
