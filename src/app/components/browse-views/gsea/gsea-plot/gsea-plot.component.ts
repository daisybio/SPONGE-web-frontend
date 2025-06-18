import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BackendService } from '../../../../services/backend.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Dataset } from '../../../../interfaces';
import { resource } from '@angular/core';

export interface GseaPlotData {
  version: number;
  globalDisease: Dataset | undefined;
  globalCondition: string;
  localDisease: Dataset | undefined;
  localCondition: string;
  geneSet: string | undefined;
  term: string;
}

@Component({
  selector: 'app-gsea-plot',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './gsea-plot.component.html',
  styleUrl: './gsea-plot.component.scss',
})
export class GseaPlotComponent {
  constructor(
    private dialogRef: MatDialogRef<GseaPlotComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GseaPlotData,
    private sanitizer: DomSanitizer,
    private backend: BackendService
  ) {}

  // Using resource API to fetch the image
  imageResource = resource({
    request: () => ({
      version: this.data.version,
      globalDisease: this.data.globalDisease,
      globalCondition: this.data.globalCondition,
      localDisease: this.data.localDisease,
      localCondition: this.data.localCondition,
      geneSet: this.data.geneSet,
      term: this.data.term,
    }),
    loader: async (params) => {
      const imageBase64 = await this.backend.getGseaPlot(
        params.request.version,
        params.request.globalDisease,
        params.request.globalCondition,
        params.request.localDisease,
        params.request.localCondition,
        params.request.geneSet,
        params.request.term
      );

      if (imageBase64) {
        return this.sanitizer.bypassSecurityTrustUrl(
          `data:image/png;base64,${imageBase64}`
        );
      }
      throw new Error('Failed to load image');
    },
  });

  close(): void {
    this.dialogRef.close();
  }
}
