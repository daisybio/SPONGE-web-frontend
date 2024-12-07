import {AfterViewInit, Component, computed, input, ViewChild} from '@angular/core';
import {CeRNAInteraction} from "../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatSort, MatSortHeader} from "@angular/material/sort";

@Component({
  selector: 'app-interactions-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortHeader,
    MatSort
  ],
  templateUrl: './interactions-table.component.html',
  styleUrl: './interactions-table.component.scss'
})
export class InteractionsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  interactions$ = input<CeRNAInteraction[]>();

  columns = ["gene_1", "gene_2", "correlation", "mscor", "padj"];

  dataSource$ = computed(() => {
    return new MatTableDataSource((this.interactions$() || []).map(interaction => {
      return {
        gene_1: interaction.gene1.gene_symbol || interaction.gene1.ensg_number,
        gene_2: interaction.gene2.gene_symbol || interaction.gene2.ensg_number,
        correlation: interaction.correlation,
        mscor: interaction.mscor,
        padj: interaction.p_value
      }
    }));
  });

  ngAfterViewInit(): void {
    const dataSource = this.dataSource$();
    dataSource.paginator = this.paginator;
    dataSource.sort = this.sort;
  }
}
