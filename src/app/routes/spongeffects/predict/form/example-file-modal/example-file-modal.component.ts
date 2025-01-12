import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import Papa from 'papaparse';
import { config } from 'rxjs';
import { ExampleExpression } from '../../../../../interfaces';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-example-file-modal',
  imports: [
    MatPaginatorModule,
    MatTableModule,
    CommonModule
  ],
  templateUrl: './example-file-modal.component.html',
  styleUrl: './example-file-modal.component.scss',
})
export class ExampleFileModalComponent implements OnInit {
  dialog = inject(MatDialog);
  readonly file = inject<File>(MAT_DIALOG_DATA);
  readonly content = (async () => {
    return Papa.parse(await this.file.text(), {'header': true});
  })();

  dataSource: MatTableDataSource<unknown, MatPaginator> = new MatTableDataSource<unknown, MatPaginator>([]);
  columns: string[] = [];

  ngOnInit() {
    this.content.then((res) => {
      console.log(res);
      this.dataSource = new MatTableDataSource(res.data);
      this.columns = res.meta.fields!;
    });
  }
}
