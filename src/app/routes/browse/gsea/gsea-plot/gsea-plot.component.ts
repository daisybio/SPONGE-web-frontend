import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

export interface GseaPlotData {
  imageBase64: string;
  term: string;
}

@Component({
  selector: 'app-gsea-plot',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './gsea-plot.component.html',
  styleUrl: './gsea-plot.component.scss',
})
export class GseaPlotComponent {
  imageSrc: SafeUrl;

  constructor(
    private dialogRef: MatDialogRef<GseaPlotComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GseaPlotData,
    private sanitizer: DomSanitizer
  ) {
    // Create a safe URL for the base64 image
    this.imageSrc = this.sanitizer.bypassSecurityTrustUrl(
      `data:image/png;base64,${data.imageBase64}`
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}
