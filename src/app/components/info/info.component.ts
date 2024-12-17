import {Component, inject, input, viewChild} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatDialog, MatDialogModule} from "@angular/material/dialog";

@Component({
  selector: 'app-info',
  imports: [
    MatButton,
    MatExpansionModule,
    MatIcon,
    MatDialogModule
  ],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss'
})
export class InfoComponent {
  dialog = inject(MatDialog);
  dialogTemplate = viewChild<any>('dialog');

  title = input.required<string>();
  subtitle = input<string>();
  type = input<'modal' | 'panel'>('modal');

  openDialog() {
    this.dialog.open(this.dialogTemplate())
  }
}
