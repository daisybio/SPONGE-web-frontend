import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {CeRNA} from "../../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator} from "@angular/material/paginator";
import {MatSort, MatSortHeader} from "@angular/material/sort";

@Component({
  selector: 'app-ce-rnas',
  imports: [MatTableModule, MatPaginator, MatSort, MatSortHeader],
  templateUrl: './ce-rnas.component.html',
  styleUrl: './ce-rnas.component.scss'
})
export class CeRNAsComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  columns = ["ensg_number", "gene_symbol", "betweenness", "eigenvector", "node_degree"];
  dataSource: MatTableDataSource<CeRNA>;

  constructor(browseService: BrowseService) {
    this.dataSource = new MatTableDataSource<any>(browseService.ceRNAs$().map(ceRNA => {
      return {
        ensg_number: ceRNA.gene.ensg_number,
        gene_symbol: ceRNA.gene.gene_symbol,
        betweenness: ceRNA.betweenness,
        eigenvector: ceRNA.eigenvector,
        node_degree: ceRNA.node_degree
      }
    }));
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
}
