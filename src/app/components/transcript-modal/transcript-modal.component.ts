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
import { MatChip } from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { AS_DESCRIPTIONS, IGV_REFGENOME } from '../../constants';
import { ModalsService } from '../modals-service/modals.service';
import { Igv, Location } from '@visa-ge/ng-igv';
import { AsyncPipe } from '@angular/common';

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
    MatChip,
    MatTooltip,
    AsyncPipe,
    Igv,
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
  asDatasource = new MatTableDataSource<AlternativeSplicingEvent>();

  miRNAtracks$ = this.browseService.getMiRNATracksForNode(this.transcript);
  readonly transcriptInfo$ = resource({
    request: this.version$,
    loader: async (version) => {
      const transcriptInfoPromise = this.backend
        .getTranscriptInfo(version.request, this.transcript.enst_number)
        .then((info) => info[0]);

      const geneInfoPromise = this.backend
        .getGeneInfo(version.request, this.transcript.gene.ensg_number)
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
