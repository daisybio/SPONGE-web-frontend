import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import Papa from 'papaparse';

@Component({
  selector: 'app-example-file-modal',
  imports: [],
  templateUrl: './example-file-modal.component.html',
  styleUrl: './example-file-modal.component.scss',
})
export class ExampleFileModalComponent implements OnInit {
  dialog = inject(MatDialog);
  readonly file = inject<File>(MAT_DIALOG_DATA);
  readonly content = (async () => {
    return Papa.parse(await this.file.text());
  })();

  ngOnInit() {
    this.content.then((res) => {
      console.log(res);
    });
  }
}
