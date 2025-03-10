import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gsea-barplot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gsea-barplot.component.html',
  styleUrl: './gsea-barplot.component.scss',
})
export class GseaBarplotComponent {
  @Input() results: any; // Type this properly based on your GSEA results type
}
