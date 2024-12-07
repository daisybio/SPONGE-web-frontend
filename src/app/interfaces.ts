export interface Dataset {
  "data_origin": string,
  "dataset_ID": number,
  "disease_name": string,
  "disease_type": string,
  "download_url": string
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

export interface CeRNA extends SpongeRun {
  betweenness: number,
  eigenvector: number,
  gene: Gene,
  node_degree: number
}

export interface CeRNAInteraction {
  "correlation": number,
  "gene1": Gene,
  "gene2": Gene,
  "mscor": number,
  "p_value": number,
}

export interface CeRNAQuery {
  disease: Dataset,
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

export interface CeRNAExpression {
  "dataset": string,
  "expr_value": number,
  "gene": Gene,
  "sample_ID": string
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
