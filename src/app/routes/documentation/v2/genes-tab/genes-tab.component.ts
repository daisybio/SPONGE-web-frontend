import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
  selector: 'app-genes-tab',
  imports: [MatTableModule, MatExpansionModule],
  templateUrl: './genes-tab.component.html',
  styleUrl: './genes-tab.component.scss',
})
export class GenesTabComponent {
  columns = ['name', 'description'];
  search_features = [
    {
      name: 'Search Box',
      description:
        'Search for a ENSG number, ENST number or Gene Symbol. Check the box to only obtain significant results.',
    },
    {
      name: 'Result Table',
      description:
        'List the disease datasets, which contain interactions with the searched gene/transcript. The table shows relevant miRNAs, correlation, mscor and adjusted p-value.',
    },
    {
      name: 'Options Button',
      description:
        "Set a range for the mscor or adjusted p-value.",
    },    
    {
      name: 'Show as Network Button',
      description:
        "Export selected table entries to create an interaction network.",
    },    
    {
      name: 'Gene Set Enrichment Button',
      description:
        "The selected entries will be used for a gene set enrichment analysis using g:Profiler.",
    }, 
  ];
  gene_transcript_features = [   
    {
      name: 'Hallmarks',
      description:
        "Show associated cancer hallmarks.",
    },
    {
      name: 'WikiPathways',
      description:
        "Show a pathway visualization on WikiPathways.",
    },
    {
      name: 'GeneCard',
      description:
        "Display further information about the gene with the help of GeneCards.",
    },
    {
      name: 'Gene Ontology',
      description:
        "Display all associated GO numbers for the gene/transcript and link to their entry on QuickGO.",
    },
  ];
}
