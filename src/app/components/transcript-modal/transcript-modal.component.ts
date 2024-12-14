import {AfterViewInit, Component, computed, effect, inject, resource, viewChild} from '@angular/core';
import {AlternativeSplicingEvent, Transcript, TranscriptInfoWithChromosome} from "../../interfaces";
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {VersionsService} from "../../services/versions.service";
import {BackendService} from "../../services/backend.service";
import {MatTabsModule} from "@angular/material/tabs";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {FormsModule} from "@angular/forms";
import {BrowseService} from "../../services/browse.service";
import {GeneModalComponent} from "../gene-modal/gene-modal.component";
import {MatProgressSpinner} from "@angular/material/progress-spinner";

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
    MatProgressSpinner
  ],
  templateUrl: './transcript-modal.component.html',
  styleUrl: './transcript-modal.component.scss'
})
export class TranscriptModalComponent implements AfterViewInit {
  readonly dialog = inject(MatDialog);
  paginator = viewChild.required(MatPaginator);
  columns = ['event_type', 'event_name']

  readonly transcript = inject<Transcript>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();
  asDatasource = new MatTableDataSource<AlternativeSplicingEvent>();

  readonly transcriptInfo$ = resource({
    request: this.version$,
    loader: async (version) => {
      const transcriptInfoPromise =
        this.backend.getTranscriptInfo(version.request, this.transcript.enst_number).then(info => info[0])

      const geneInfoPromise =
        this.backend.getGeneInfo(version.request, this.transcript.gene.ensg_number).then(info => info[0]);

      const [transcriptInfo, geneInfo] = await Promise.all([transcriptInfoPromise, geneInfoPromise]);

      return {
        ...transcriptInfo,
        chromosome_name: geneInfo.chromosome_name
      } as TranscriptInfoWithChromosome
    }
  })
  isCanonical$ = computed(() => {
    const info = this.transcriptInfo$.value();
    if (info === undefined) return "Unknown";
    if (info.canonical_transcript === 0) {
      return "No";
    } else if (info.canonical_transcript === 1) {
      return "Yes";
    } else {
      return "Unknown";
    }
  })
  alternativeSplicingEvents = resource({
    loader: () => this.backend.getAlternativeSplicingEvents([this.transcript.enst_number])
  })
  protected readonly BrowseService = BrowseService;

  constructor() {
    effect(() => {
      this.asDatasource.data = this.alternativeSplicingEvents.value() || [];
    })
  }

  showGene() {
    this.dialog.open(GeneModalComponent, {
      data: this.transcript.gene
    })
  }

  ngAfterViewInit(): void {
    this.asDatasource.paginator = this.paginator();
  }
}
