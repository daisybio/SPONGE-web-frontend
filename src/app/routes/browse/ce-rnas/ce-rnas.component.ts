import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {CeRNA} from "../../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator} from "@angular/material/paginator";

@Component({
  selector: 'app-ce-rnas',
  imports: [MatTableModule, MatPaginator],
  templateUrl: './ce-rnas.component.html',
  styleUrl: './ce-rnas.component.scss'
})
export class CeRNAsComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  columns = ["ensg_number", "gene_symbol", "betweenness", "eigenvector", "node_degree"];
  dataSource: MatTableDataSource<CeRNA>;

  constructor(browseService: BrowseService) {
    this.dataSource = new MatTableDataSource<CeRNA>(browseService.ceRNAs$());
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
}
