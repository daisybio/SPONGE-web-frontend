import {Component, computed, input, ViewChild} from '@angular/core';
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
export class InteractionsTableComponent {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  interactions$ = input.required<CeRNAInteraction[] | null>();
  columns = ["gene_1", "gene_2", "correlation", "mscor", "padj", "id"];

  dataSource$ = computed(() => {
    const source = new MatTableDataSource((this.interactions$() || []).map(interaction => {
      return {
        gene_1: interaction.gene1.gene_symbol || interaction.gene1.ensg_number,
        gene_2: interaction.gene2.gene_symbol || interaction.gene2.ensg_number,
        correlation: interaction.correlation,
        mscor: interaction.mscor,
        padj: interaction.p_value,
        id: interaction.run.run_ID
      }
    }));
    source.paginator = this.paginator;
    source.sort = this.sort;
    return source;
  })
}
