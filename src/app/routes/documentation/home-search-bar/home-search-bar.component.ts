import {Component} from '@angular/core';
import {MatTableModule} from "@angular/material/table";

@Component({
  selector: 'app-home-search-bar',
  imports: [
    MatTableModule
  ],
  templateUrl: './home-search-bar.component.html',
  styleUrl: './home-search-bar.component.scss'
})
export class HomeSearchBarComponent {
  columns = ["name", "description"];
  features = [
    {
      "name": "Search Box",
      "description": "Search for a ENSG number or Gene Symbol. Check the box to only obtain significant results."
    },
    {
      "name": "Result Boxes",
      "description": "Lists the cancer datasets, which contain interactions with the searched value. The tables visualize values such as mscore, p-value, correlation, and IDs."
    },
    {
      "name": "Options Button",
      "description": "Set a range for the mscore or adjusted p-value. You don't have to submit your entry; it will be applied automatically."
    },
    {
      "name": "Hallmarks",
      "description": "Associated cancer hallmarks."
    },
    {
      "name": "Show as Network Button",
      "description": "Exports selected table entries or default ones to create an interaction network."
    },
    {
      "name": "Gene Enrichment Button",
      "description": "If no gene is selected, all genes will be used for gene enrichment analysis. Otherwise, the selected entries will be used for a default query on g:Profiler."
    },
    {
      "name": "WikiPathways",
      "description": "Brings you to a pathway visualization on WikiPathways."
    },
    {
      "name": "GeneCard",
      "description": "Displays further information about the gene with the help of GeneCards."
    },
    {
      "name": "Gene Ontology",
      "description": "All associating GO numbers will be displayed for the gene and link to their entry on QuickGO."
    }
  ]
}
