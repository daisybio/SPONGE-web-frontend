import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gsea-volcanoplot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gsea-volcanoplot.component.html',
  styleUrl: './gsea-volcanoplot.component.scss',
})
export class GseaVolcanoplotComponent {
  @Input() results: any; // Type this properly based on your GSEA results type
}
