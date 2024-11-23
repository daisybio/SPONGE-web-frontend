import {Component, input} from '@angular/core';
import {CeRNAInteraction} from "../../interfaces";
import {MatTableModule} from "@angular/material/table";

@Component({
  selector: 'app-interactions-table',
  imports: [
    MatTableModule
  ],
  templateUrl: './interactions-table.component.html',
  styleUrl: './interactions-table.component.scss'
})
export class InteractionsTableComponent {
  interactions$ = input.required<CeRNAInteraction[]>();
  columns = ["gene_1", "gene_2", "correlation", "mscor", "padj", "id"];

}
