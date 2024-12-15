export interface Dataset {
    dataset_ID: number,
    disease_name: string,
    data_origin: string,
    disease_type: string,
    download_url: string,
    disease_subtype: string,
    study_abbreviation: string,
    sponge_db_version: string
  }
  
  export interface DatasetInfo {
    dataset_ID: number,
    disease_name: string,
    data_origin: string,
    disease_type: string,
    download_url: string,
    disease_subtype: string,
    study_abbreviation: string,
    number_of_samples: number,
    sponge_db_version: string
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
    gene_symbol?: string
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
    "gene1": Gene,
    "gene2": Gene,
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
  
  export interface CeRNAExpression {
    "dataset": string,
    "expr_value": number,
    "gene": Gene,
    "sample_ID": string
  }
  
  export interface TranscriptExpression {
    "dataset": string,
    "transcript": string,
    "expr_value": number,
    "gene": {
      "ensg_number": string,
      "gene_symbol": Gene
    },
    "sample_ID": string,
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
  
  export interface GeneCount {
    "count_all": number,
    "count_sign": number,
    "gene": {
      "ensg_number": string,
      "gene_symbol": string
    },
    "run": {
      "dataset": {
        "data_origin": string,
        "dataset_ID": number,
        "disease_name": string
      },
      "run_ID": number
    }
  }
  
  // from spongEffects
  // route responses
  
  export interface SpongEffectsRun {
    spongeEffects_run_ID: number,
    m_scor_threshold: number,
    p_adjust_threshold: number,
    modules_cutoff: number,
    bin_size: number,
    min_size: number,
    max_size: number,
    min_expr: number,
    method: string,
    cv_folds: number
    level:  string,
    sponge_run_ID: number, 
    variance_cutoff: number,
    f_test: boolean,
    f_test_p_adj_threshold: number,
    coefficient_threshold: number,
    coefficient_direction:  string,
    min_corr: number,
    number_of_datasets: number, 
    number_of_samples: number, 
    ks: string,
    m_max: number, 
    log_level: string,
    sponge_db_version:  string,
    dataset_ID: number, 
    disease_name: string,
    data_origin: string,
    disease_type: string,
    download_url: string,
    disease_subtype: string,
  }
  
  export interface RunPerformance {
    model_type: string,
    split_type: string,
    accuracy: number,
    kappa: number,
    accuracy_lower: number,
    accuracy_upper: number,
    accuracy_null: number,
    accuracy_p_value: number,
    mcnemar_p_value: number
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
    ensg_number: string;
    gene_symbol: string;
    mean_gini_decrease: number;
    mean_accuracy_decrease: number;
  }
  
  export interface SpongEffectsGeneModuleMembers {
    hub_ensg_number: string;
    hub_gene_symbol: string;
    member_ensg_number: string;
    member_gene_symbol: string;
  }
  
  export interface SpongEffectsTranscriptModules {
    enst_number: string;
    gene: {
      ensg_number: string;
      gene_symbol: string;
    };
    mean_gini_decrease: number;
    mean_accuracy_decrease: number;
  }
  
  export interface SpongEffectsTranscriptModuleMembers {
    hub_enst_number: string;
    hub_gene: {
      ensg_number: string;
      gene_symbol: string;
    };
    member_enst_number: string;
    member_gene: {
      ensg_number: string;
      gene_symbol: string;
    };
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
  
  // other interfaces for spongEffects
  
  export interface Metric {
    name: string,
    split: string
    lower: number,
    upper: number,
    level: number
  }
  
  export interface SelectElement {
    value: string,
    viewValue: string
  }
  
  export interface CancerInfo {
    text: string[],
    link: string;
  }
  
  export interface PlotData {
    x: number[],
    y: number[]
  }
  
  export interface PlotlyData {
    data: any,
    layout?: any,
    config?: any
  }
  
  export interface Tab extends SelectElement {
    icon: string
  }
  
  export interface LinearRegression {
    slope: number,
    x0: number
  }
  
  export interface ExampleExpression {
    id: string;
    sample1: number;
    sample2: number;
    sample3: number;
    sample4: number;
    sampleN: number;
  }
  
  
  