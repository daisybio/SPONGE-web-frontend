export interface Dataset {
  "data_origin": string,
  "dataset_ID": number,
  "disease_name": string,
  "disease_type": string,
  "download_url": string
}

export interface OverallCounts {
  count_interactions: number,
  count_interactions_sign: number,
  count_shared_miRNAs: number,
  disease_name: string,
  run_ID: number
}

export enum GeneSorting {
  Betweenness = "Betweenness",
  DbDegree = "DbDegree",
  Eigenvector = "Eigenvector"
}

export enum InteractionSorting {
  pAdj = "adjusted p-value",
  mScor = "MScor",
  Correlation = "Correlation"
}
