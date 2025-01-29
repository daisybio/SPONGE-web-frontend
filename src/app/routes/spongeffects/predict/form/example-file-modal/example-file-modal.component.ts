import { AfterViewInit, Component, inject, OnInit, Signal, ViewChild, signal, resource, computed, effect } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import Papa from 'papaparse';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-example-file-modal',
  imports: [
    MatPaginatorModule,
    MatTableModule,
    CommonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './example-file-modal.component.html',
  styleUrl: './example-file-modal.component.scss',
})
export class ExampleFileModalComponent implements OnInit {
  dialog = inject(MatDialog);
  isLoading = false;
  readonly file = inject<File>(MAT_DIALOG_DATA);
  readonly content = (async () => {
    return Papa.parse(await this.file.text(), {'header': true});
  })();

  dataSource: MatTableDataSource<unknown, MatPaginator> = new MatTableDataSource<unknown, MatPaginator>([]);
  dataSourceResource = resource({
    request: computed(() => {
      return {
        data: this.content
      }
    }),
    loader: async (param) => {
      const data = await param.request.data;
      return new MatTableDataSource(data.data);
    }
    
  })

  columns: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    effect(() => {
      if (this.dataSourceResource.value()) {
        this.dataSourceResource.value()!.paginator = this.paginator;
        this.dataSource = this.dataSourceResource.value()!;
      }
    });
  }

  ngOnInit() {
    this.content.then((res) => {
      this.columns = res.meta.fields!;
      this.isLoading = false;
    });
  }


}
