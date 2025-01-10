import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-example-file-modal',
  imports: [],
  templateUrl: './example-file-modal.component.html',
  styleUrl: './example-file-modal.component.scss',
})
export class ExampleFileModalComponent implements OnInit {
  dialog = inject(MatDialog);
  readonly file = inject<File>(MAT_DIALOG_DATA);

  ngOnInit(): void {
    console.log(this.file);
  }
}
