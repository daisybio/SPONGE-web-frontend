import { Data } from "@angular/router";

export interface Dataset {
  data_origin: string;
  dataset_ID: number;
  disease_name: string;
  disease_subtype: string | null;
  disease_type: string;
  download_url: string;
  sponge_db_version: number;
}

export interface SpongeRun {
  sponge_run: {
    dataset: {
      data_origin: string;
      dataset_ID: number;
      disease_name: string;
    };
    sponge_run_ID: number;
  };
}

export interface RunInfo {
  coefficient_direction: string;
  coefficient_threshold: string;
  dataset: {
    dataset_ID: number;
    disease_name: string;
  };
  f_test: boolean;
  f_test_p_adj_threshold: number;
  ks: string;
  log_level: string;
  m_max: number;
  min_corr: number;
  number_of_datasets: number;
  number_of_samples: number;
  sponge_run_ID: number;
  variance_cutoff: string;
}

export interface DatasetInfo {
  dataset_ID: number;
  disease_name: string;
  data_origin: string;
  disease_type: string;
  download_url: string;
  disease_subtype: string;
  study_abbreviation: string;
  version: number;
  number_of_samples: number;
}

export interface OverallCounts {
  count_interactions: number;
  count_interactions_sign: number;
  count_shared_miRNAs: number;
  disease_name: string;
  sponge_run_ID: number;
}

// export enum GeneSorting {
//   betweenness = 'Betweenness centrality',
//   degree = 'node_Degree centrality',
//   eigenvector = 'Eigenvector centrality',
// }

export enum InteractionSorting {
  pValue = 'Adj. p-value',
  mscor = 'mscor',
  correlation = 'Correlation',
}

export interface Gene {
  ensg_number: string;
  gene_symbol?: string;
}

export interface Transcript {
  enst_number: string;
  gene: Gene;
}

export interface GeneNode extends SpongeRun {
  betweenness: number;
  eigenvector: number;
  gene: Gene;
  node_degree: number;
}

export interface TranscriptNode extends SpongeRun {
  betweenness: number;
  eigenvector: number;
  transcript: Transcript;
  node_degree: number;
}

export interface GeneInteraction extends SpongeRun {
  correlation: number;
  gene1: Gene;
  gene2: Gene;
  mscor: number;
  p_value: number;
}

export interface TranscriptInteraction extends SpongeRun {
  correlation: number;
  mscor: number;
  p_value: number;
  transcript_1: Transcript;
  transcript_2: Transcript;
}

export interface BrowseQuery {
  level: 'gene' | 'transcript';
  dataset: Dataset;
  showOrphans: boolean;
  sortingDegree: boolean;
  sortingEigenvector: boolean;
  sortingBetweenness: boolean;
  maxNodes: number;
  minDegree: number;
  minBetweenness: number;
  minEigen: number;
  interactionSorting: InteractionSorting;
  maxInteractions: number;
  maxPValue: number;
  minMscor: number;
}

export interface CeRNA {
  betweenness: number;
  eigenvector: number;
  gene: Gene;
  node_degree: number;
  run: {
    dataset: {
      data_origin: string;
      dataset_ID: number;
      disease_name: string;
    };
    run_ID: number;
  };
}

export interface CeRNAInteraction {
  correlation: number;
  gene1: Gene;
  gene2: Gene;
  mscor: number;
  p_value: number;
  run: {
    dataset: {
      data_origin: string;
      dataset_ID: number;
      disease_name: string;
    };
    run_ID: number;
  };
}

export interface Network {
  edges: (GeneInteraction | TranscriptInteraction)[];
  nodes: (GeneNode | TranscriptNode)[];
}

export interface CeRNAExpression {
  dataset: string;
  expr_value: number;
  gene: Gene;
  sample_ID: string;
}

export interface GeneExpression {
  dataset: Dataset;
  expr_value: number;
  gene: Gene;
  sample_ID: string;
}

export interface TranscriptExpression {
  dataset: Dataset;
  expr_value: number;
  sample_ID: string;
  transcript: Transcript;
}

export interface SurvivalRate {
  dataset: string;
  gene: Gene;
  overexpression: number;
  patient_information: {
    disease_status: number;
    sample_ID: string;
    survival_time: number;
  };
}

export interface SurvivalPValue {
  dataset: string;
  gene: Gene;
  pValue: number;
}

export interface GeneCount extends SpongeRun {
  count_all: number;
  count_sign: number;
  gene: Gene;
}

export interface GeneInfo {
  chromosome_name: string;
  cytoband: string;
  description: string;
  end_pos: number;
  ensg_number: string;
  gene_symbol: string;
  gene_type: string;
  start_pos: number;
}

export interface TranscriptInfo {
  ensg_number: string;
  transcript_type: string;
  start_pos: number;
  end_pos: number;
  canonical_transcript: number;
}

export interface TranscriptInfoWithChromosome extends TranscriptInfo {
  chromosome_name: string;
}

export interface GOTerm {
  description: string;
  gene: Gene;
  gene_ontology_symbol: string;
}

export interface Hallmark {
  gene: Gene;
  hallmark: string;
}

export interface WikiPathway {
  gene: Gene;
  wp_key: string;
}

// from spongEffects
// route responses

export interface SpongEffectsRun {
  spongEffects_run_ID: number;
  m_scor_threshold: number;
  p_adj_threshold: number;
  modules_cutoff: number;
  bin_size: number;
  min_size: number;
  max_size: number;
  min_expr: number;
  method: string;
  cv_folds: number;
  level: string;
  sponge_run: SpongeRun;
  m_max: number;
  log_level: string;
  sponge_db_version: number;
  dataset_ID: number;
  disease_name: string;
  data_origin: string;
  disease_type: string;
  download_url: string;
  disease_subtype: string;
}

export interface RunPerformance {
  model_type: string;
  split_type: string;
  accuracy: number;
  kappa: number;
  accuracy_lower: number;
  accuracy_upper: number;
  accuracy_null: number;
  accuracy_p_value: number;
  mcnemar_p_value: number;
  spongEffects_run: SpongEffectsRun;
}

export interface RunClassPerformance {
  prediction_class: string;
  sensitivity: number;
  specificity: number;
  pos_pred_value: number;
  neg_pred_value: number;
  precision_value: number;
  recall: number;
  f1: number;
  prevalence: number;
  detection_rate: number;
  detection_prevalence: number;
  balanced_accuracy: number;
  spongEffects_run: {
    model_type: string;
    split_type: string;
  };
}

export interface EnrichmentScoreDistributions {
  prediction_class: string;
  enrichment_score: number;
  density: number;
}

export interface SpongEffectsGeneModules {
  getSpongEffectsGeneModules: number;
  gene: {
    ensg_number: string;
    gene_symbol: string;
  };
  mean_gini_decrease: number;
  mean_accuracy_decrease: number;
}

export interface SpongEffectsGeneModuleMembers {
  gene: {
    ensg_number: string;
    gene_symbol: string;
  };
  spongEffects_gene_module_ID: number
  spongEffects_gene_module_members_ID: number; 
}

export interface SpongEffectsTranscriptModules {
  spongEffects_transcript_module_ID: number;
  transcript: {
    enst_number: string;
  };
  mean_gini_decrease: number;
  mean_accuracy_decrease: number;
}

export interface SpongEffectsTranscriptModuleMembers {
  transcript: {
    enst_number: string;
  };
  spongEffects_gene_module_ID: number
  spongEffects_gene_module_members_ID: number; 
}

export interface SpongEffectsModule {
  ensemblID: string;
  symbol: string;
  meanGiniDecrease: number;
  meanAccuracyDecrease: number;
}

export interface ModuleMember {
  ensemblID: string;
  symbol: string;
  moduleCenter: string;
}


export interface PredictCancerType {
  meta: {
    runtime: number;
    level: string;
    n_samples: number;
    type_predict: string;
    subtype_predict: string;
  };
  data: {
    sampleID: string;
    typePrediction: string;
    subtypePrediction: string;
  }[];
}

export interface ExploreQuery {
  selectedCancer: string;
  selectedLevel: string;
}

// other interfaces for spongEffects

export interface Metric {
  name: string;
  split: string;
  lower: number;
  upper: number;
  idx: number;
  spongEffecsRun: SpongEffectsRun;
}

export interface SelectElement {
  value: string;
  viewValue: string;
}

export interface CancerInfo {
  text: string[];
  link: string;
}

export interface PlotData {
  x: number[];
  y: number[];
}

export interface PlotlyData {
  data: any;
  layout?: any;
  config?: any;
}

export interface Tab extends SelectElement {
  icon: string;
}

export interface LinearRegression {
  slope: number;
  x0: number;
}

export interface ExampleExpression {
  id: string;
  sample1: number;
  sample2: number;
  sample3: number;
  sample4: number;
  sampleN: number;
}

export interface AlternativeSplicingEvent {
  alternative_splicing_event_transcripts_ID: number;
  event_name: string;
  event_type: string;
  transcript: {
    enst_number: string;
  };
}

export interface MiRNA {
  hs_nr: string;
  mir_ID: string;
}

export interface TranscriptMiRNA extends SpongeRun {
  transcript: Transcript;
  mirna: MiRNA;
  coefficient: number;
}

export interface GeneMiRNA extends SpongeRun {
  gene: Gene;
  mirna: MiRNA;
  coefficient: number;
}

export interface NetworkResult {
  subtype: {};
  type: {
    euclidean_distances: {
      labels: string[];
      x: number[];
      y: number[];
    };
    scores: {
      labels: string[];
      values: number[][];
    };
  };
}

export interface Comparison {
  comparison_ID: number;
  condition_1: string;
  condition_2: string;
  dataset_1: Dataset;
  dataset_2: Dataset;
  gene_transcript: 'gene' | 'transcript';
}

export interface GseaResult {
  es: number;
  fdr: number;
  fwerp: number;
  gene_percent: number;
  nes: number;
  pvalue: number;
  tag_percent: string;
  term: string;
  lead_genes: {
    gene: Gene;
    gsea_lead_genes_ID: number;
  }[];
  matched_genes: {
    gene: Gene;
    gsea_matched_genes_ID: number;
  };
}
