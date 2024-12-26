import {AfterViewInit, Component, effect, input, OnDestroy, viewChild} from '@angular/core';
import {GseaResult} from "../../../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatSort, MatSortModule} from "@angular/material/sort";

@Component({
  selector: 'app-gsearesults',
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './gsearesults.component.html',
  styleUrl: './gsearesults.component.scss'
})
export class GSEAresultsComponent implements AfterViewInit, OnDestroy {
  paginator = viewChild.required(MatPaginator);
  sort = viewChild.required(MatSort);
  results$ = input.required<GseaResult[]>();
  dataSource = new MatTableDataSource<GseaResult>();

  columns = [
    'es',
    'fdr',
    'fwerp',
    'gene_percent',
    'nes',
    'pvalue',
    'tag_percent',
    'term'
  ]

  updateDataSource = effect(() => {
    this.dataSource.data = this.results$();
  })

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator()!;
    this.dataSource.sort = this.sort()!;
  }

  ngOnDestroy() {
    this.updateDataSource.destroy()
  }
}
