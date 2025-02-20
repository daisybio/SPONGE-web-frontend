import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
  selector: 'app-browse-tab',
  imports: [MatTableModule, MatExpansionModule],
  templateUrl: './browse-tab.component.html',
  styleUrl: './browse-tab.component.scss',
})
export class BrowseTabComponent {
  columns = ['name', 'description'];
  network_features = [
    {
      name: 'Disease Select',
      description:
        'Select one of the disease datasets to visualize the disease-specific ceRNA network.',
    },    
    {
      name: 'Disease Subtype Select',
      description:
        'If available, select one of the disease subtype datasets to visualize the subtype-specific ceRNA network.',
    },
    {
      name: 'Genes /Transcripts Switch',
      description:
        'Show ceRNA network on gene-level vs transcript-level.',
    },    
    {
      name: 'Nodes Filter Criteria',
      description:
        'Select node sorting by node degree, betweenness or eigenvector value. Select thresholds for filtering the ceRNA network nodes: maximum amount of nodes, minimum node degree, minimum betweenness, minimum eigenvector. Decide to show orphan nodes (without interactions).',
    },    
    {
      name: 'Interactions Filter Criteria',
      description:
        'Select edge sorting by adjusted p-value, correlation or mscor. Select thresholds for filtering the ceRNA network interactions: maximum amount of interactions, maximum adjusted p-value, minimum mscor.',
    },    
    {
      name: 'View raw data',
      description:
        'Show original expression data ceRNA network computation is based upon.',
    },    
    {
      name: 'Click on a Node',
      description:
        'Show betweenness, eigenvector, node degree and further details for the selected node.',
    },    
    {
      name: 'Click on a Edge',
      description:
        'Show correlation, mscor, adjusted p-value and a list of supporting miRNAs with corresponding correlations to neighboring nodes and a link to mirbase with further information.',
    },    
    {
      name: 'Functional enrichment analysis',
      description:
        'Open g:Profiler to do a functional enrichment analysis for all visible nodes.',
    },   
    {
      name: 'Save as',
      description:
        'You can save and download the plot as .jpg or .png.',
    },  
    {
      name: 'Reset camera',
      description:
        'Reset the viewpoint of the network after zooming or focusing on a node.',
    },
    {
      name: 'Physics',
      description:
        'Turn off physics for an individualized visualization of bigger networks.',
    }
  ];
  node_features = [ 
    {
      name: 'Hallmarks',
      description:
        'Show associated cancer hallmarks.',
    },
    {
      name: 'WikiPathways',
      description:
        'Show a pathway visualization on WikiPathways.',
    },
    {
      name: 'GeneCard',
      description:
        'Display further information about the gene with the help of GeneCards.',
    },
    {
      name: 'Gene Ontology',
      description:
        'Display all associated GO numbers for the gene/transcript and link to their entry on QuickGO.',
    },
    {
      name: 'Transcript information',
      description:
        'Show all transcripts for a gene.',
    },
    {
      name: 'Alternative splicing',
      description:
        'Show all relevant splice events and their position for a transcript: Skipping Exon (SE), Alternative 5’ Splice Site (A5), Alternative 3’ Splice Site (A3), Mutually Exclusive Exon (MX), Retained Intron (RI), Alternative First Exon (AF), and Alternative Last Exon (AL).',
    },
    {
      name: 'Survival Analysis',
      description:
        'A Kaplan-Meier Plot showing patient survival will be displayed for the node.',
    }
  ];
  analysis_features = [
    {
      name: 'Expression Heatmap',
      description:
      'Show an expression heatmap for the chosen disease and nodes to visually distinguish consistently expressed biomarkers.'
    },   
    {
      name: 'Genes/Transcripts',
      description:
      'Show a searchable list of nodes with their betweenness, eigenvector, node degree values.'
    },
    {
      name: 'Interactions',
      description:
      'Show a searchable list of edges with their neighbouring nodes, supporting miRNAs, correlation, adjusted p-value and mscor values.'
    },
    {
      name: 'Gene Set Enrichment',
      description:
      'Compare the disease (or normal condition) to another disease (sub-)type via gene set enrichment analysis on a chosen gene set. Shown is a list of enrichment score (ES), FDR qvalue (adjusted False Discory Rate, FDR), family wise error rate p-values (FWERP), percent of gene list before running enrichment peak (Gene percent), normalized enrichment score (NES), nominal p-value from the null distribution of the gene set (p-value), percent of gene set before running enrichment peak (Tag percent), gene set name (Term).'
    },
    {
      name: 'Disease similarities',
      description:
      'Visualize similarities between the chosen disease network and the other disease networks. Shown are Euclidean distances between the hubness scores in a two-dimensional space. The gene-wise hubness score is calculated by dividing the degree of the gene in the network by the number of possible edges. The network hubness score is the mean of the gene-wise hubness scores. '
    },

  ];
}
