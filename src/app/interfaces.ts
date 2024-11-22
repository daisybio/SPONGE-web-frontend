export interface Dataset {
  "data_origin": string,
  "dataset_ID": number,
  "disease_name": string,
  "disease_type": string,
  "download_url": string
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
  "run_ID": number,
  "variance_cutoff": string
}

export interface OverallCounts {
  count_interactions: number,
  count_interactions_sign: number,
  count_shared_miRNAs: number,
  disease_name: string,
  run_ID: number
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
  gene_symbol: string
}

export interface CeRNA {
  betweenness: number,
  eigenvector: number,
  gene: Gene,
  node_degree: number
  run: {
    dataset: {
      data_origin: string,
      dataset_ID: number,
      disease_name: string
    },
    run_ID: number
  }
}

export interface CeRNAInteraction {
  "correlation": number,
  "gene1": string,
  "gene2": string,
  "mscor": number,
  "p_value": number,
  "run": {
    "dataset": {
      "data_origin": string,
      "dataset_ID": number,
      "disease_name": string
    },
    "run_ID": number
  }
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