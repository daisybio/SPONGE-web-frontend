import {AfterViewInit, Component, computed, effect, inject, resource, viewChild} from '@angular/core';
import {GeneInteraction, MiRNA, TranscriptInteraction} from "../../interfaces";
import {MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {BackendService} from "../../services/backend.service";
import {VersionsService} from "../../services/versions.service";
import {BrowseService} from "../../services/browse.service";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator} from "@angular/material/paginator";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {MatAnchor} from "@angular/material/button";
import {MatTooltip} from "@angular/material/tooltip";

interface TableData {
  node1_coefficient: number;
  node2_coefficient: number;
  hs_nr: string;
  mir_ID: string;
}

@Component({
  selector: 'app-interaction-modal',
  imports: [MatDialogModule, MatProgressSpinner, MatTableModule, MatPaginator, MatSortModule, MatAnchor, MatTooltip],
  templateUrl: './interaction-modal.component.html',
  styleUrl: './interaction-modal.component.scss'
})
export class InteractionModalComponent implements AfterViewInit {
  paginator = viewChild.required(MatPaginator);
  sort = viewChild.required(MatSort);
  readonly interaction = inject<GeneInteraction | TranscriptInteraction>(MAT_DIALOG_DATA);
  tableData = new MatTableDataSource<TableData>();
  columns = ['hs_nr', 'mir_ID', 'node1_coefficient', 'node2_coefficient'];
  protected readonly browseService = inject(BrowseService);
  disease$ = this.browseService.disease$;
  protected readonly BrowseService = BrowseService;
  private readonly backend = inject(BackendService);
  private readonly versionsService = inject(VersionsService);
  version$ = this.versionsService.versionReadOnly();
  miRNAs$ = resource({
    request: computed(() => {
      return {
        version: this.version$(),
        level: 'gene1' in this.interaction ? 'gene' : 'transcript',
        disease: this.disease$()
      }
    }),
    loader: async (param) => {
      const disease = param.request.disease;
      if (disease === undefined) return;
      const identifiers = BrowseService.getInteractionIDs(this.interaction);
      return await this.backend.getMiRNAs(param.request.version, disease, identifiers, param.request.level as 'gene' | 'transcript');
    }
  })
  tableData$ = computed(() => {
    const miRNAs = this.miRNAs$.value();
    if (miRNAs === undefined) return [];

    const formatted = miRNAs.reduce((acc, miRNA) => {
      const miRNAid = miRNA.mirna.mir_ID;
      const nodeID = 'gene' in miRNA ? miRNA.gene.ensg_number : miRNA.transcript.enst_number;
      if (!acc.has(miRNAid)) {
        acc.set(miRNAid, new Map<string, {
          miRNA: MiRNA,
          coefficient: number
        }>());
      }
      if (acc.get(miRNAid)!.has(nodeID)) {
        console.warn(`Duplicate miRNA ${miRNAid} for node ${nodeID}`);
        return acc;
      }
      acc.get(miRNAid)!.set(nodeID, {
        miRNA: miRNA.mirna,
        coefficient: miRNA.coefficient
      });
      return acc;
    }, new Map<string, Map<string, {
      miRNA: MiRNA,
      coefficient: number
    }>>());

    const nodeIDs = BrowseService.getInteractionIDs(this.interaction);

    return Array.from(formatted.entries()).map(([miRNAid, nodes]) => {
      const node1 = nodes.get(nodeIDs[0]);
      const node2 = nodes.get(nodeIDs[1]);

      return {
        node1_coefficient: node1?.coefficient ?? NaN,
        node2_coefficient: node2?.coefficient ?? NaN,
        hs_nr: (node1?.miRNA.hs_nr ?? node2?.miRNA.hs_nr)!,
        mir_ID: miRNAid
      };
    }).filter((entry): entry is TableData => entry !== undefined);
  })

  constructor() {
    effect(() => {
      this.tableData.data = this.tableData$();
    });
  }

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator();
    this.tableData.sort = this.sort();
  }
}
