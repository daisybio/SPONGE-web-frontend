import {Component, inject} from '@angular/core';
import {Gene} from "../../interfaces";
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {FormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";

@Component({
  selector: 'app-gene-modal',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
  templateUrl: './gene-modal.component.html',
  styleUrl: './gene-modal.component.scss'
})
export class GeneModalComponent {
  readonly dialogRef = inject(MatDialogRef<GeneModalComponent>);
  readonly gene = inject<Gene>(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close();
  }
}
