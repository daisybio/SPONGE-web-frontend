import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-spongeffects-tab',
  imports: [
    MatTableModule,
    MatExpansionModule
  ],
  templateUrl: './spongeffects-tab.component.html',
  styleUrl: './spongeffects-tab.component.scss'
})
export class SpongeffectsTabComponent {
  columns = ['name', 'description'];
  explore_features = [
    {
      name: 'Model performance',
      description:
        'Visualize the accuracy of our pretrained models trained on spongEffects modules vs the performance of models trained on randomly selected SPONGE centralities on test and training data. This shown for three possible combinations of model parameters.',
    },
    {
      name: 'Class performance',
      description:
        'Visualize the balanced accuracy separately for the disease subtypes of our pretrained models trained on spongEffects modules vs the performance of models trained on randomly selected SPONGE centralities in a stacked bar plot.',
    },
    {
      name: 'Classification', 
      description: 
        'Visualize the balanced accuracy separately for the disease subtypes of our pretrained models trained on spongEffects modules vs the performance of models trained on randomly selected SPONGE centralities in a stacked bar plot.',
    }, 
    {
      name: 'Top ceRNA centralities', 
      description: 
        'Visualize the top rated genes for the selected disease by mean decrease in accuracy and mean decrease in Gini-index. Open g:Profiler to do a functional enrichment analysis for those genes.',
    }
  ];
  predict_features = [
    {
      name: 'Filtering thresholds',
      description: 
        'Visualize the top rated genes for the selected disease by mean decrease in accuracy and mean decrease in Gini-index. Open g:Profiler to do a functional enrichment analysis for those genes.',
    },
    {
      name: 'Furhter settings',
      description:
        'Select enrichment method from Gene set variation analysis (GSVA, see https://pubmed.ncbi.nlm.nih.gov/23323831/), Single sample Gene Set Enrichment analysis (ssGSEA) or Overall Expression (OE, see ). Define the minimum and maximum module size (default 100-2000). Decide whether to apply log2 scaling to uploaded expression data and whether to predict on subtype level.',
    },
  ];
}
