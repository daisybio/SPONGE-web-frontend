export interface Dataset {
  "data_origin": string,
  "dataset_ID": number,
  "disease_name": string,
  disease_subtype: string | null,
  "disease_type": string,
  "download_url": string,
  sponge_db_version: number
}

export interface SpongeRun {
  "sponge_run": {
    "dataset": {
      "data_origin": string,
      "dataset_ID": number,
      "disease_name": string
    },
    "sponge_run_ID": number
  }
}

export interface RunInfo {
  "coefficient_direction": string,
  "coefficient_threshold": string,
  "dataset": {
    "dataset_ID": number,
    "disease_name": string
  },
  "f_test": boolean,
  "f_test_p_adj_threshold": number,
  "ks": string,
  "log_level": string,
  "m_max": number,
  "min_corr": number,
  "number_of_datasets": number,
  "number_of_samples": number,
  "sponge_run_ID": number,
  "variance_cutoff": string
}

export interface OverallCounts {
  count_interactions: number,
  count_interactions_sign: number,
  count_shared_miRNAs: number,
  disease_name: string,
  sponge_run_ID: number
}

export enum GeneSorting {
  Betweenness = "betweenness",
  Degree = "degree",
  Eigenvector = "eigenvector"
}

export enum InteractionSorting {
  pAdj = "adjusted p-value",
  mScor = "MScor",
  Correlation = "Correlation"
}

export interface Gene {
  ensg_number: string,
  gene_symbol?: string
}

export interface Transcript {
  enst_number: string,
  gene: Gene
}

export interface GeneNode extends SpongeRun {
  betweenness: number,
  eigenvector: number,
  gene: Gene,
  node_degree: number
}

export interface TranscriptNode extends SpongeRun {
  betweenness: number,
  eigenvector: number,
  transcript: Transcript,
  node_degree: number
}

export interface GeneInteraction extends SpongeRun {
  "correlation": number,
  "gene1": Gene,
  "gene2": Gene,
  "mscor": number,
  "p_value": number,
}

export interface TranscriptInteraction extends SpongeRun {
  "correlation": number,
  "mscor": number,
  "p_value": number,
  "transcript_1": Transcript,
  "transcript_2": Transcript
}

export interface BrowseQuery {
  level: 'gene' | 'transcript',
  dataset: Dataset,
  geneSorting: GeneSorting,
  maxGenes: number,
  minDegree: number,
  minBetweenness: number,
  minEigen: number,
  interactionSorting: InteractionSorting,
  maxInteractions: number,
  maxPValue: number,
  minMScore: number
}

export interface GeneExpression {
  "dataset": string,
  "expr_value": number,
  "gene": Gene,
  "sample_ID": string
}

export interface TranscriptExpression {
  "dataset": string,
  "expr_value": number,
  "sample_ID": string,
  "transcript": Transcript
}

export interface SurvivalRate {
  "dataset": string,
  "gene": Gene,
  "overexpression": number,
  "patient_information": {
    "disease_status": number,
    "sample_ID": string,
    "survival_time": number
  }
}

export interface SurvivalPValue {
  "dataset": string,
  "gene": Gene,
  "pValue": number
}

export interface GeneCount extends SpongeRun {
  "count_all": number,
  "count_sign": number,
  "gene": Gene
}

export interface GeneInfo {
  chromosome_name: string,
  cytoband: string,
  description: string,
  end_pos: number,
  ensg_number: string,
  gene_symbol: string,
  gene_type: string,
  start_pos: number
}

export interface TranscriptInfo {
  ensg_number: string,
  transcript_type: string,
  start_pos: number,
  end_pos: number,
  canonical_transcript: number
}

export interface TranscriptInfoWithChromosome extends TranscriptInfo {
  chromosome_name: string
}

export interface GOTerm {
  description: string,
  gene: Gene,
  gene_ontology_symbol: string
}

export interface Hallmark {
  gene: Gene,
  hallmark: string
}

export interface WikiPathway {
  gene: Gene,
  wp_key: string
}

export interface AlternativeSplicingEvent {
  event_name: string,
  event_type: string,
  transcript: {
    enst_number: string
  }
}

export interface MiRNA {
  hs_nr: string,
  mir_ID: string
}

export interface TranscriptMiRNA extends SpongeRun {
  transcript: Transcript,
  mirna: MiRNA,
  coefficient: number
}

export interface GeneMiRNA extends SpongeRun {
  gene: Gene,
  mirna: MiRNA,
  coefficient: number
}
