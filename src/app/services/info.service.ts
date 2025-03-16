import { Injectable, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

@Injectable({
  providedIn: 'root',
})
export class InfoService {
  [key: string]: any;
  constructor(private sanitizer: DomSanitizer) {}

  // node info texts
  betweennessText = 'Betweenness centrality focuses on bottlenecks. A node with high betweenness centrality within a graph lies on a significant proportion of the shortest paths between two other nodes.'
  degreeText = 'Degree centrality measures the number of edges connected to a node and emphasizes the significance of hub nodes, which are recognized as pivotal elements within biological systems.'
  eigenvectorText = "Eigenvector centrality is a measure of a node's influence in a network. A node with high eigenvector centrality is pointed to by many nodes, which also have high eigenvector centrality."

  // edge info texts
  mscorText = 'SPONGE computes multiple miRNA sensitivity correlation values. Note that this is a generalization of sensitivity correlation as defined by <a href="https://www.ncbi.nlm.nih.gov/pubmed/25033876">Paci et al.</a>. These values capture the joint contribution of several miRNAs on the ceRNA regulation of two genes while accounting for their cross-correlation.'
  pValText = 'SPONGE computes a null model to calculate empirical p-values for the ceRNA interactions. We sampled 1,000,000 datasets to closely estimate the p-values. The interactions were then FDR-corrected and filtered with a p-value cut-off of 0.01.'
  correlationText = 'The adj. p-value is a measure of the significance of the interaction between two nodes. It is based on the number of interactions between two nodes and the number of interactions of the nodes in the network. The adj. p-value is a measure of the importance of the interaction in the network.'

  // top ceRNA texts
  meanGiniDecrease = 'The mean Gini decrease is a measure of the importance of a feature in a decision tree. It is calculated by averaging the Gini decrease of a feature over all decision trees in the forest.'
  meanAccuracyDecrease = 'The mean accuracy decrease is a measure of the importance of a feature in a decision tree. It is calculated by averaging the accuracy decrease of a feature over all decision trees in the forest.'
  memberOrCenter = 'The table shows both module members and module centers. Module members are the genes that are part of the module, while module centers are the genes that are most connected to the module members.'
  moduleCenter = 'Module centers are the genes that are most connected to the module members.'

  renderMscorEquation(element: ElementRef): void {
    if (element) {
      katex.render(
        'mscor(g_1, g_2, M) = cor(g_1, g_2) - pcor(g_1, g_2 | M)',
        element.nativeElement,
        {
          output: 'mathml',
        },
      );
    }
  }
}