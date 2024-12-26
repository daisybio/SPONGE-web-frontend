import {AfterViewInit, Component, effect, input, OnDestroy, output, viewChild} from '@angular/core';
import {GseaResult} from "../../../../interfaces";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatSort, MatSortModule} from "@angular/material/sort";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-gsearesults',
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButton
  ],
  templateUrl: './gsearesults.component.html',
  styleUrl: './gsearesults.component.scss'
})
export class GSEAresultsComponent implements AfterViewInit, OnDestroy {
  paginator = viewChild.required(MatPaginator);
  sort = viewChild.required(MatSort);
  results$ = input.required<GseaResult[]>();
  dataSource = new MatTableDataSource<GseaResult>();
  termSelected = output<string>()

  columns = [
    'term',
    'es',
    'fdr',
    'fwerp',
    'gene_percent',
    'nes',
    'pvalue',
    'tag_percent',
    'show_plot'
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
