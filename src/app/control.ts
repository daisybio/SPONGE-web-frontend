import * as $ from 'jquery';
import { ConditionalExpr } from '@angular/compiler';

export class Controller {
  static API_ENDPOINT: string;

  constructor() {
    if (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1'
    ) {
      Controller.API_ENDPOINT = 'http://localhost:5000/';
    } else {
      Controller.API_ENDPOINT = window.location.origin + '/sponge-api';
    }
  }

  static CERNA_INTERACTION_FINDALL = '/ceRNAInteraction/findAll';
  static CERNA_INTERACTION_SPECIFIC = '/ceRNAInteraction/findSpecific';
  static CHECKGENEINTERACTION = '/ceRNAInteraction/checkGeneInteraction';
  static FIND_CERNA = '/findceRNA';
  static GENE_COUNT = '/getGeneCount';

  static MIRNA_INTERACTION_SPECIFIC = '/miRNAInteraction/findSpecific';
  static MIRNA_INTERACTION_FIND_CERNA = '/miRNAInteraction/findceRNA';
  // static MIRNA_INTERACTION_OCCURENCE = "/miRNAInteraction/getOccurence"

  static DATASETS = '/dataset';
  static SPONGEFFECTS_DATA = '/dataset/spongEffects';
  static DATASET_INFORMATION = '/dataset/runInformation';

  static EXPRESSION_VALUE_CERNA = '/exprValue/getceRNA';
  // static EXPRESSION_VALUE_MIRNA = "/exprValue/getmirNA"

  static STRING_SEARCH = '/stringSearch';

  static SURVIVAL_ANALYSIS_PVALUE = '/survivalAnalysis/getPValues';
  static SURVIVAL_ANALYSIS_RATES = '/survivalAnalysis/getRates';
  static SURVIVAL_ANALYSIS_SAMPLEINFO = '/survivalAnalysis/sampleInformation';

  static OVERALL_COUNTS = '/getOverallCounts';
  static GENE_ONTOLOGY = '/getGeneOntology';
  static HALLMARKS = '/getHallmark';
  static PATHWAY = '/getWikipathway';

  public search_string(config: {
    searchString: string;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.STRING_SEARCH;
    if (Object.keys(config).length > 1) {
      request += '?';
    }

    request += 'searchString=' + config.searchString;
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public gene_count(config: {
    disease_name?: string;
    ensg_number?: string[];
    gene_symbol?: string[];
    minCountAll?: number;
    minCountSign?: number;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.GENE_COUNT;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    if (config.minCountAll != undefined) {
      request += '&minCountAll=' + config.minCountAll;
    }
    if (config.minCountSign != undefined) {
      request += '&minCountSign=' + config.minCountSign;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public check_gene_interaction(config: {
    ensg_number?: string[];
    gene_symbol?: string[];
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.CHECKGENEINTERACTION;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public async get_miRNA_by_ceRNA(config: {
    disease_name?: string;
    ensg_number?: string[];
    gene_symbol?: string[];
    between: boolean;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request =
      Controller.API_ENDPOINT + Controller.MIRNA_INTERACTION_FIND_CERNA;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    if (config.between != undefined) {
      request += '&between=' + config.between;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }
  /** Reads the spongEffects files of the static file server and returns the names of the found files to make the available for download. */
  public get_spongEffects_data() {
    return [
      'SpongEffects_bladder urothelial carcinoma',
      'SpongEffects_brain lower grade glioma',
      'SpongEffects_breast invasive carcinoma',
      'SpongEffects_cervical & endocervical cancer',
      'SpongEffects_colon adenocarcinoma',
      'SpongEffects_esophageal carcinoma',
      'SpongEffects_head & neck squamous cell carcinoma',
      'SpongEffects_kidney clear cell carcinoma',
      'SpongEffects_kidney papillary cell carcinoma',
      'SpongEffects_liver hepatocellular carcinoma',
      'SpongEffects_lung squamous cell carcinoma',
      'SpongEffects_pancreatic adenocarcinoma',
      'SpongEffects_pheochromocytoma & paraganglioma',
      'SpongEffects_prostate adenocarcinoma',
      'SpongEffects_sarcoma',
      'SpongEffects_stomach adenocarcinoma',
      'SpongEffects_testicular germ cell tumor',
      'SpongEffects_thymoma',
      'SpongEffects_thyroid carcinoma',
    ];
  }

  public get_miRNA_interactions_all(config: {
    disease_name?: string;
    mimat_number?: string[];
    hs_number?: string[];
    limit?: number;
    offset?: number;
    information?: number;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request =
      Controller.API_ENDPOINT + Controller.MIRNA_INTERACTION_SPECIFIC;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.mimat_number != undefined) {
      request += '&mimat_number=' + config.mimat_number;
    }
    if (config.hs_number != undefined) {
      request += '&hs_number=' + config.hs_number;
    }
    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    if (config.information != undefined) {
      request += '&information=' + config.information;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public get_expression_ceRNA(config: {
    disease_name: string;
    ensg_number?: string[];
    gene_symbol?: string[];
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.EXPRESSION_VALUE_CERNA;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    request += '&disease_name=' + config.disease_name;
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public get_ceRNA_interactions_all(config: {
    disease_name?: string;
    descending?: boolean;
    information?: boolean;
    limit?: number;
    pValue?: number;
    ensg_number?: string[];
    gene_symbol?: string[];
    offset?: number;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request =
      Controller.API_ENDPOINT + Controller.CERNA_INTERACTION_FINDALL;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name.replace('+', '%2b');
    }
    if (config.information != undefined) {
      request += '&information=' + config.information;
    }
    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.pValue != undefined) {
      request += '&pValue=' + config.pValue;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public async get_ceRNA_interactions_specific(config: {
    disease_name?: string;
    gene_symbol?: string[];
    offset?: number;
    ensg_number?: string[];
    limit?: number;
    pValue?: number;
    pValueDirection?: string;
    error?: (response) => any;
  }) {
    let request =
      Controller.API_ENDPOINT + Controller.CERNA_INTERACTION_SPECIFIC;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.pValue != undefined) {
      request += '&pValue=' + config.pValue;
    }
    if (config.pValueDirection != undefined) {
      request += '&pValueDirection=' + config.pValueDirection;
    }
    return $.getJSON(request).fail((response) => {
      return config.error(response);
    });
  }

  public async get_ceRNA(config: {
    disease_name: string;
    ensg_number?: string[];
    gene_symbol?: string[];
    gene_type?: string;
    minBetweenness?: number;
    minNodeDegree?: number;
    minEigenvector?: number;
    sorting?: string;
    descending?: boolean;
    limit?: number;
    offset?: number;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.FIND_CERNA;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    if (config.gene_type != undefined) {
      request += '&gene_type=' + config.gene_type;
    }
    if (config.minBetweenness != undefined) {
      request += '&betweenness=' + config.minBetweenness;
    }
    if (config.minNodeDegree != undefined) {
      request += '&degree=' + config.minNodeDegree;
    }
    if (config.minEigenvector != undefined) {
      request += '&eigenvector=' + config.minEigenvector;
    }
    if (config.sorting != undefined) {
      request += '&sorting=' + config.sorting;
    }
    if (config.descending != undefined) {
      request += '&descending=' + config.descending;
    }
    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    return $.getJSON(request).fail((response) => {
      return config.error(response);
    });
  }

  public get_survival_pvalue(config: {
    disease_name: string;
    ensg_number: string[];
    gene_symbol?: string[];
    limit?: number;
    offset?: number;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.SURVIVAL_ANALYSIS_PVALUE;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }

    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public get_survival_rates(config: {
    disease_name: string;
    ensg_number: string[];
    gene_symbol?: string[];
    sample_ID?: string[];
    limit?: number;
    offset?: number;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.SURVIVAL_ANALYSIS_RATES;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.ensg_number != undefined) {
      request += '&ensg_number=' + config.ensg_number;
    }
    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    if (config.sample_ID != undefined) {
      request += '&sample_ID=' + config.sample_ID;
    }

    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public get_survival_sampleInfo(config: {
    disease_name: string;
    sample_ID: string[];
    limit?: number;
    offset?: number;
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request =
      Controller.API_ENDPOINT + Controller.SURVIVAL_ANALYSIS_SAMPLEINFO;
    if (Object.keys(config).length > 1) {
      request += '?';
    }
    if (config.disease_name != undefined) {
      request += '&disease_name=' + config.disease_name;
    }
    if (config.sample_ID != undefined) {
      request += '&sample_ID=' + config.sample_ID;
    }

    if (config.limit != undefined) {
      request += '&limit=' + config.limit;
    }
    if (config.offset != undefined) {
      request += '&offset=' + config.offset;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  /** Returns all the available datasets or just information of a specific disease. */
  public async get_datasets(diseaseName?: string): Promise<any> {
    let request = Controller.API_ENDPOINT + Controller.DATASETS;
    if (diseaseName !== undefined) {
      request += '?disease_name=' + diseaseName;
    }
    return $.getJSON(request).fail(() => {
      $('#browse_loading_spinner').addClass('hidden');

      $('#overlay-error').css('visibility', 'visible');
    });
  }

  public async get_dataset_information(disease_name: string) {
    return $.getJSON(
      Controller.API_ENDPOINT +
        Controller.DATASET_INFORMATION +
        '?disease_name=' +
        disease_name
    ).fail(function () {
      $('#browse_loading_spinner').addClass('hidden');

      $('#error_overlay').css('visibility', 'visible');
    });
  }

  public get_overall_counts(config: {
    callback: (response) => any;
    error?: (response) => any;
  }) {
    const request = Controller.API_ENDPOINT + Controller.OVERALL_COUNTS;
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public get_GO(config: {
    gene_symbol: string[];
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.GENE_ONTOLOGY;
    if (Object.keys(config).length > 1) {
      request += '?';
    }

    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }

  public get_Hallmark(config: {
    gene_symbol: string[];
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.HALLMARKS;
    if (Object.keys(config).length > 1) {
      request += '?';
    }

    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail(function () {
      return config.error('No hallmark associated');
    });
  }

  public get_WikiPathway(config: {
    gene_symbol: string[];
    callback: (response) => any;
    error?: (response) => any;
  }) {
    let request = Controller.API_ENDPOINT + Controller.PATHWAY;
    if (Object.keys(config).length > 1) {
      request += '?';
    }

    if (config.gene_symbol != undefined) {
      request += '&gene_symbol=' + config.gene_symbol;
    }
    $.getJSON(request, (response) => {
      return config.callback(response);
    }).fail((response) => {
      return config.error(response);
    });
  }
}
