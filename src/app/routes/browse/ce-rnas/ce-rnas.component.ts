import {AfterViewInit, Component, inject, ViewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {CeRNA, Gene} from "../../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator} from "@angular/material/paginator";
import {MatSort, MatSortHeader} from "@angular/material/sort";
import {MatButton} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {GeneModalComponent} from "../../../components/gene-modal/gene-modal.component";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
  selector: 'app-ce-rnas',
  imports: [MatTableModule, MatPaginator, MatSort, MatSortHeader, MatButton, MatTooltip],
  templateUrl: './ce-rnas.component.html',
  styleUrl: './ce-rnas.component.scss'
})
export class CeRNAsComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  columns = ["gene_symbol", "betweenness", "eigenvector", "node_degree"];
  dataSource: MatTableDataSource<CeRNA>;
  readonly dialog = inject(MatDialog);

  constructor(browseService: BrowseService) {
    this.dataSource = new MatTableDataSource<any>(browseService.ceRNAs$().map(ceRNA => {
      return {
        gene_symbol: ceRNA.gene.gene_symbol || ceRNA.gene.ensg_number,
        betweenness: ceRNA.betweenness,
        eigenvector: ceRNA.eigenvector,
        node_degree: ceRNA.node_degree,
        gene: ceRNA.gene
      }
    }));
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openDialog(gene: Gene) {
    this.dialog.open(GeneModalComponent, {
      data: gene
    });
  }
}
