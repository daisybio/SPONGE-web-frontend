import {Component, inject, input, viewChild} from '@angular/core';
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatDialog, MatDialogModule} from "@angular/material/dialog";
import {NgTemplateOutlet} from "@angular/common";

@Component({
  selector: 'app-info',
  imports: [
    MatButtonModule,
    MatExpansionModule,
    MatIcon,
    MatDialogModule,
    NgTemplateOutlet
  ],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss'
})
export class InfoComponent {
  dialog = inject(MatDialog);
  dialogTemplate = viewChild<any>('dialog');

  title = input<string>('What does this mean?');
  subtitle = input<string>();
  type = input<'modal' | 'panel' | 'icon'>('modal');

  openDialog() {
    this.dialog.open(this.dialogTemplate())
  }
}
