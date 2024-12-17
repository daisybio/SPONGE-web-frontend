import {AfterViewInit, Component, computed, inject, input, ViewChild} from '@angular/core';
import {Gene, GeneInteraction, Transcript, TranscriptInteraction} from "../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatSort, MatSortHeader} from "@angular/material/sort";
import {GeneModalComponent} from "../gene-modal/gene-modal.component";
import {MatDialog} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {MatTooltip} from "@angular/material/tooltip";
import {BrowseService} from "../../services/browse.service";
import {TranscriptModalComponent} from "../transcript-modal/transcript-modal.component";
import {InteractionModalComponent} from "../interaction-modal/interaction-modal.component";

@Component({
  selector: 'app-interactions-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortHeader,
    MatSort,
    MatButton,
    MatTooltip
  ],
  templateUrl: './interactions-table.component.html',
  styleUrl: './interactions-table.component.scss'
})
export class InteractionsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  interactions$ = input<(GeneInteraction | TranscriptInteraction)[]>();
  readonly dialog = inject(MatDialog);

  columns = ["name_1", "name_2", "mirna", "correlation", "mscor", "padj"];

  dataSource$ = computed(() => {
    return new MatTableDataSource((this.interactions$() || []).map(interaction => {
      const names = BrowseService.getInteractionFullNames(interaction);
      return {
        name_1: names[0],
        name_2: names[1],
        correlation: interaction.correlation,
        mscor: interaction.mscor,
        padj: interaction.p_value,
        obj1: 'gene1' in interaction ? interaction.gene1 : interaction.transcript_1,
        obj2: 'gene2' in interaction ? interaction.gene2 : interaction.transcript_2,
        interaction
      }
    }));
  });

  ngAfterViewInit(): void {
    const dataSource = this.dataSource$();
    dataSource.paginator = this.paginator;
    dataSource.sort = this.sort;
  }

  openMiRNADialog(interaction: GeneInteraction | TranscriptInteraction) {
    this.dialog.open(InteractionModalComponent, {
      data: interaction
    })
  }

  openDialog(entity: Gene | Transcript) {
    if ('ensg_number' in entity) {
      this.dialog.open(GeneModalComponent, {
        data: entity
      })
    } else {
      this.dialog.open(TranscriptModalComponent, {
        data: entity
      })
    }
  }
}
