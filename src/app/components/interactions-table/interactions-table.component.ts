import {AfterViewInit, Component, computed, inject, input, ViewChild} from '@angular/core';
import {CeRNAInteraction, Gene} from "../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatSort, MatSortHeader} from "@angular/material/sort";
import {GeneModalComponent} from "../gene-modal/gene-modal.component";
import {MatDialog} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {MatTooltip} from "@angular/material/tooltip";

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
  interactions$ = input<CeRNAInteraction[]>();
  readonly dialog = inject(MatDialog);

  columns = ["gene_1", "gene_2", "correlation", "mscor", "padj"];

  dataSource$ = computed(() => {
    return new MatTableDataSource((this.interactions$() || []).map(interaction => {
      return {
        gene_1: interaction.gene1.gene_symbol || interaction.gene1.ensg_number,
        gene_2: interaction.gene2.gene_symbol || interaction.gene2.ensg_number,
        correlation: interaction.correlation,
        mscor: interaction.mscor,
        padj: interaction.p_value,
        gene1_obj: interaction.gene1,
        gene2_obj: interaction.gene2
      }
    }));
  });

  ngAfterViewInit(): void {
    const dataSource = this.dataSource$();
    dataSource.paginator = this.paginator;
    dataSource.sort = this.sort;
  }

  openDialog(gene: Gene) {
    this.dialog.open(GeneModalComponent, {
      data: gene
    })
  }
}
