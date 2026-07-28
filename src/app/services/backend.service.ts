import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import {
  AlternativeSplicingEvent,
  ASPsiValue,
  BrowseQuery,
  CeRNAExpression,
  CeRNAInteraction,
  Comparison,
  Dataset,
  EnrichmentScoreDistributions,
  Gene,
  GeneCount,
  GeneExpression,
  GeneInfo,
  GeneInteraction,
  GeneMiRNA,
  GeneNode,
  GOTerm,
  GseaResult,
  Hallmark,
  Network,
  NetworkResult,
  OverallCounts,
  PatientInformation,
  PredictCancerType,
  RunClassPerformance,
  RunInfo,
  RunPerformance,
  SpongEffectsGeneModuleMembers,
  SpongEffectsGeneModules,
  SpongEffectsRun,
  SpongEffectsTranscriptModuleMembers,
  SpongEffectsTranscriptModules,
  SurvivalPValue,
  SurvivalRate,
  Transcript,
  TranscriptCount,
  TranscriptExpression,
  TranscriptInfo,
  TranscriptInteraction,
  TranscriptMiRNA,
  TranscriptNode,
  WikiPathway,
} from '../interfaces';
import { API_BASE } from '../constants';

interface Query {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  constructor(private http: HttpService) { }

  async getDatasets(version: number, diseaseName?: string): Promise<Dataset[]> {
    const route = 'datasets';

    const query: Query = {
      sponge_db_version: version,
    };

    if (diseaseName) {
      query['disease_name'] = diseaseName;
    }

    return (await this.http.getRequest<Dataset[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getDatasetInfo(version: number, diseaseName: string): Promise<RunInfo[]> {
    const route = 'dataset/spongeRunInformation';
    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
    };
    return (await this.http.getRequest<RunInfo[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getOverallCounts(version: number, level: string): Promise<OverallCounts[]> {
    const route = 'getOverallCounts';
    const query: Query = { sponge_db_version: version, level: level };
    return (await this.http.getRequest<OverallCounts[]>(
      this.getRequestURL(route, query)
    )) ?? [];
  }

  async getNetwork(version: number, query: BrowseQuery): Promise<Network> {
    const level = query.level;
    const route =
      level == 'gene'
        ? 'ceRNAInteraction/getGeneNetwork'
        : 'ceRNAInteraction/getTranscriptNetwork';

    const geneSorting: String[] = [
      'betweenness',
      'node_degree',
      'eigenvector',
    ].filter(
      (_, i) =>
        [
          query.sortingBetweenness,
          query.sortingDegree,
          query.sortingEigenvector,
        ][i]
    );

    const numOrUndefined = (val: any) => typeof val === 'number' && !isNaN(val) ? val : undefined;

    const _query: Query = {
      sponge_db_version: version,
      dataset_ID: query.dataset.dataset_ID,
      minBetweenness: numOrUndefined(query.minBetweenness),
      minNodeDegree: numOrUndefined(query.minDegree),
      minEigenvector: numOrUndefined(query.minEigen),
      maxPValue: numOrUndefined(query.maxPValue),
      minMscor: numOrUndefined(query.minMscor),
      edgeSorting: query.interactionSorting,
      maxNodes: numOrUndefined(query.maxNodes),
      maxEdges: numOrUndefined(query.maxInteractions),
    };
    // Only send a node sort when at least one is selected. With none selected the backend
    // skips the networkAnalysis-based node selection and derives nodes straight from the
    // edges, so no nodes are lost.
    if (geneSorting.length > 0) {
      _query["nodeSorting"] = geneSorting;
    }
    if (query.ensemblID) {
      _query["ensemblID"] = Array.isArray(query.ensemblID)
        ? query.ensemblID.join(',')
        : query.ensemblID;
    }

    return (await this.http.getRequest<Network>(this.getRequestURL(route, _query))) ?? { nodes: [], edges: [] } as Network;
  }

  // getNodes(
  //   version: number,
  //   query: BrowseQuery
  // ): Promise<(GeneNode | TranscriptNode)[]> {
  //   const level = query.level;
  //   const route = level == 'gene' ? 'findceRNA' : 'findceRNATranscripts';

  //   if (
  //     version != query.dataset.sponge_db_version ||
  //     (version < 2 && level == 'transcript')
  //   ) {
  //     return Promise.resolve([]);
  //   }

  //   const internalQuery: Query = {
  //     sponge_db_version: version,
  //     disease_name: query.dataset.disease_name,
  //     dataset_ID: query.dataset.dataset_ID,
  //     minBetweenness: query.minBetweenness,
  //     minNodeDegree: query.minDegree,
  //     minEigenvector: query.minEigen,
  //     sorting: query.geneSorting,
  //     descending: true,
  //     limit: query.maxNodes,
  //   };

  //   return this.http.getRequest<(GeneNode | TranscriptNode)[]>(
  //     this.getRequestURL(route, internalQuery)
  //   );
  // }

  async getGeneInteractionsAll(
    version: number,
    disease: Dataset | undefined,
    maxPValue: number,
    ensgs: string[]
  ): Promise<GeneInteraction[]> {
    const route = 'ceRNAInteraction/findAll';

    if (
      ensgs.length === 0 ||
      !disease ||
      version != disease.sponge_db_version
    ) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      ensg_number: ensgs.join(','),
      pValue: maxPValue,
    };

    const results: GeneInteraction[] = [];
    const limit = 1000;
    let offset = 0;

    let data: GeneInteraction[];

    do {
      data = (await this.http.getRequest<GeneInteraction[]>(
        this.getRequestURL(route, {
          ...query,
          limit,
          offset,
        })
      )) ?? [];
      results.push(...data);
      offset += limit;
    } while (data.length === limit);

    return results;
  }

  async getTranscriptInteractionsAll(
    version: number,
    disease: Dataset | undefined,
    maxPValue: number,
    ensts: string[]
  ): Promise<TranscriptInteraction[]> {
    const route = 'ceRNAInteraction/findAllTranscripts';

    if (ensts.length === 0 || !disease || version != disease.sponge_db_version) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      enst_number: ensts.join(','),
      pValue: maxPValue,
    };

    const results: TranscriptInteraction[] = [];
    const limit = 1000;
    let offset = 0;

    let data: TranscriptInteraction[];

    do {
      data = (await this.http.getRequest<TranscriptInteraction[]>(
        this.getRequestURL(route, {
          ...query,
          limit,
          offset,
        })
      )) ?? [];
      results.push(...data);
      offset += limit;
    } while (data.length === limit);

    return results;
  }

  async getInteractionsSpecific(
    version: number,
    disease: Dataset,
    maxPValue: number,
    identifiers: string[],
    level: 'gene' | 'transcript',
    limit?: number
  ): Promise<(GeneInteraction | TranscriptInteraction)[]> {
    const route =
      level == 'gene'
        ? 'ceRNAInteraction/findSpecific'
        : 'ceRNAInteraction/findSpecificTranscripts';

    if (identifiers.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      pValue: maxPValue,
    };
    if (limit !== undefined) {
      query['limit'] = limit;
    }

    if (level == 'gene') {
      query['ensg_number'] = identifiers.join(',');
    } else {
      query['enst_number'] = identifiers.join(',');
    }

    const res = await this.http.getRequest<any>(
      this.getRequestURL(route, query)
    );
    if (res && !Array.isArray(res) && res.data) {
      return res.data;
    }
    return (Array.isArray(res) ? res : []) as (GeneInteraction | TranscriptInteraction)[];
  }

  async getExpression(
    version: number,
    identifiers: string[],
    disease_name: string | undefined,
    dataset_ID: number | undefined,
    level: 'gene' | 'transcript',
    limit: number | undefined = undefined,
    offset: number | undefined = undefined,
    cluster: boolean = false
  ): Promise<(GeneExpression | TranscriptExpression)[]> {
    const route =
      level == 'gene' ? 'exprValue/getceRNA' : 'exprValue/getTranscriptExpr';

    if (identifiers.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      dataset_ID: dataset_ID,
      disease_name: disease_name,
      limit: limit,
      offset: offset,
      cluster: cluster,
    };

    // drop query params that are undefined
    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) {
        delete query[key];
      }
    });

    if (level == 'gene') {
      query['ensg_number'] = identifiers.join(',');
    } else {
      query['enst_number'] = identifiers.join(',');
    }

    return (await this.http.getRequest<
      (GeneExpression | TranscriptExpression)[]
    >(this.getRequestURL(route, query))) ?? [];
  }

  async getSurvivalRates(
    version: number,
    ensgs: string[],
    disease: Dataset
  ): Promise<SurvivalRate[]> {
    const route = 'survivalAnalysis/getRates';
    const query: Query = {
      disease_name: disease.disease_name,
      sponge_db_version: 'any',
      ensg_number: ensgs.join(','),
    };

    return (await this.http.getRequest<SurvivalRate[]>(
      this.getRequestURL(route, query)
    )) ?? [];
  }

  async getAutocomplete(version: number, query: string): Promise<Gene[]> {
    if (query.length < 2) {
      return Promise.resolve([]);
    }

    const route = 'stringSearch';
    const queryObj: Query = {
      sponge_db_version: version,
      searchString: query,
    };
    try {
      return (await this.http.getRequest<Gene[]>(this.getRequestURL(route, queryObj))) ?? [];
    } catch (e) {
      return [];
    }
  }

  async stringSearchTranscript(query: string): Promise<Transcript[]> {
    if (query.length < 2) {
      return [];
    }

    const route = 'stringSearchTranscript';
    const queryObj: Query = {
      searchString: query,
    };
    return (await this.http.getRequest<Transcript[]>(
      this.getRequestURL(route, queryObj)
    )) ?? [];
  }

  async getTranscriptInfo(version: number, enst: string): Promise<TranscriptInfo[]> {
    const route = 'getTranscriptInformation';
    const query: Query = {
      sponge_db_version: version,
      enst_number: enst,
    };
    return (await this.http.getRequest<TranscriptInfo[]>(
      this.getRequestURL(route, query)
    )) ?? [];
  }

  async getGeneInfo(version: number, ensg: string): Promise<GeneInfo[]> {
    const route = 'getGeneInformation';
    const query: Query = {
      sponge_db_version: version,
      ensg_number: ensg,
    };
    return (await this.http.getRequest<GeneInfo[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getGOterms(version: number, symbol: string | undefined): Promise<GOTerm[]> {
    const route = 'getGeneOntology';

    if (!symbol) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      gene_symbol: symbol,
    };
    return (await this.http.getRequest<GOTerm[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getHallmark(
    version: number,
    symbol: string | undefined
  ): Promise<Hallmark[]> {
    const route = 'getHallmark';

    if (!symbol) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      gene_symbol: symbol,
    };
    const hallmarks = await this.http.getRequest<Hallmark[] | {}>(
      this.getRequestURL(route, query)
    );
    if (!Array.isArray(hallmarks)) {
      return [];
    }
    return hallmarks;
  }

  async getWikiPathways(
    version: number,
    symbol: string | undefined
  ): Promise<WikiPathway[]> {
    const route = 'getWikipathway';

    if (!symbol) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      gene_symbol: symbol,
    };
    const wikipathways = await this.http.getRequest<WikiPathway[] | {}>(
      this.getRequestURL(route, query)
    );

    if (!Array.isArray(wikipathways)) {
      return [];
    }
    return wikipathways;
  }

  async getGeneCount(
    version: number,
    ensgs: string[],
    onlySignificant: boolean
  ): Promise<GeneCount[]> {
    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }
    const route = 'getGeneCount';
    const query: Query = {
      sponge_db_version: version,
      ensg_number: ensgs.join(','),
    };
    if (onlySignificant) {
      query['minCountSign'] = 1;
    }
    const res = await this.http.getRequest<GeneCount[]>(
      this.getRequestURL(route, query)
    );
    if (!res || ('title' in res && (res as any).title == 'No Content')) {
      return [];
    }
    return res;
  }

  async getTranscriptCount(
    version: number,
    ensts: string[],
    onlySignificant: boolean
  ): Promise<TranscriptCount[]> {
    if (ensts.length === 0) {
      return Promise.resolve([]);
    }
    const route = 'getTranscriptCount';
    const query: Query = {
      sponge_db_version: version,
      enst_number: ensts.join(','),
    };
    if (onlySignificant) {
      query['minCountSign'] = 1;
    }
    const res = await this.http.getRequest<TranscriptCount[]>(
      this.getRequestURL(route, query)
    );
    if (!res || ('title' in res && (res as any).title == 'No Content')) {
      return [];
    }
    return res;
  }

  async getGeneTranscripts(version: number, ensg: string): Promise<string[]> {
    const route = 'getGeneTranscripts';
    const query: Query = {
      sponge_db_version: version,
      ensg_number: ensg,
    };
    const res = await this.http.getRequest<string[][]>(this.getRequestURL(route, query));
    return res?.[0] ?? [];
  }

  async checkDigger(
    identifier: string,
    level: 'gene' | 'transcript' = 'gene'
  ): Promise<{ exists: boolean; url: string | null }> {
    if (!identifier) {
      return { exists: false, url: null };
    }
    const route = 'alternativeSplicing/checkDigger';
    const query: Query = { identifier, level };
    const res = await this.http.getRequest<{ exists: boolean; url: string | null }>(
      this.getRequestURL(route, query)
    );
    return res ?? { exists: false, url: null };
  }

  async getMiRNAs(
    version: number,
    disease: Dataset,
    identifiers: [string, string],
    level: 'gene' | 'transcript'
  ) {
    const route =
      level == 'gene'
        ? 'miRNAInteraction/findceRNA'
        : 'miRNAInteraction/findceRNATranscripts';

    const query: Query = {
      sponge_db_version: version,
      dataset_ID: disease.dataset_ID,
      between: true,
    };
    if (level == 'gene') {
      query['ensg_number'] = identifiers.join(',');
    } else {
      query['enst_number'] = identifiers.join(',');
    }

    return (await this.http.getRequest<GeneMiRNA[] | TranscriptMiRNA[]>(
      this.getRequestURL(route, query)
    )) ?? [];
  }

  async getAlternativeSplicingEvents(
    ensts: string[]
  ): Promise<AlternativeSplicingEvent[]> {
    const route = 'alternativeSplicing/getTranscriptEvents';

    const query: Query = {
      enst_number: ensts.join(','),
    };

    const resp = await this.http.getRequest<AlternativeSplicingEvent[]>(
      this.getRequestURL(route, query)
    );
    return !resp || 'detail' in resp ? [] : resp;
  }

  async getCeRNAInteractionsAll(
    disease: string,
    maxPValue: number,
    ensgs: string[],
    limit?: number,
    offset?: number
  ): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findAll';
    const query: Query = {
      disease_name: disease,
      ensg_number: ensgs.join(','),
      pValue: maxPValue,
    };

    if (limit) {
      query['limit'] = limit;
    }
    if (offset) {
      query['offset'] = offset;
    }

    return (await this.http.getRequest<CeRNAInteraction[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getCeRNAInteractionsSpecific(
    disease: string,
    maxPValue: number,
    ensgs: string[]
  ): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findSpecific';
    const query: Query = {
      disease_name: disease,
      ensg_number: ensgs.join(','),
      pValue: maxPValue,
    };

    const res = await this.http.getRequest<any>(
      this.getRequestURL(route, query)
    );
    if (res && !Array.isArray(res) && res.data) {
      return res.data;
    }
    return (Array.isArray(res) ? res : []) as CeRNAInteraction[];
  }

  // getCeRNA(query: CeRNAQuery): Promise<CeRNA[]> {
  //   const sponge_db_version = this.versionService.getCurrentVersion();
  //   let request = BackendService.API_BASE + '/findceRNA?disease_name=' + query.disease.disease_name + `?sponge_db_version=${sponge_db_version}`;

  //   request += `&minBetweenness=${query.minBetweenness}`;
  //   request += `&minNodeDegree=${query.minDegree}`;
  //   request += `&minEigenvector=${query.minEigen}`;
  //   request += `&sorting=${query.geneSorting}`;
  //   request += `&descending=${true}`;
  //   request += `&limit=${query.maxGenes}`;

  //   return this.http.getRequest<CeRNA[]>(request);
  // }

  async getCeRNAExpression(
    ensgs: string[],
    diseaseName: string
  ): Promise<CeRNAExpression[]> {
    const route = 'exprValue/getceRNA';
    const query: Query = {
      disease_name: diseaseName,
      ensg_number: ensgs.join(','),
    };

    return (await this.http.getRequest<CeRNAExpression[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getTranscriptExpression(
    ensts: string[],
    disease_name?: string
  ): Promise<TranscriptExpression[]> {
    const route = 'exprValue/getTranscript';
    const query: Query = {
      disease_name: disease_name,
      enst_number: ensts.join(','),
    };

    return (await this.http.getRequest<TranscriptExpression[]>(this.getRequestURL(route, query))) ?? [];
  }

  async fetchExpressionData(
    version: number,
    identifiers: string[],
    datasetId: number | undefined,
    disease_name: string | undefined,
    level: "gene" | "transcript"
  ): Promise<any[]> {
    const CHUNK_SIZE = 1000;
    const N_PARALLEL_REQUESTS = 5;
    const expressionData: any[] = [];
    let hasMoreData = true;
    let offset = 0;

    while (hasMoreData) {
      // Fetch multiple pages in parallel
      const pagePromises = Array.from({ length: N_PARALLEL_REQUESTS }, (_, i) => {
        const currentOffset = offset + i * CHUNK_SIZE;
        return this.getExpression(version, identifiers, disease_name, datasetId, level, CHUNK_SIZE, currentOffset, true);
      });

      const pageResults = await Promise.all(pagePromises);

      // Flatten and add results
      for (const page of pageResults) {
        if (page.length > 0) {
          expressionData.push(...page);
        }
        // If a page has fewer rows than CHUNK_SIZE, we've reached the end
        if (page.length < CHUNK_SIZE) {
          hasMoreData = false;
          break; // Stop processing further pages in this batch
        }
      }

      if (hasMoreData) {
        offset += CHUNK_SIZE * N_PARALLEL_REQUESTS;
      }
    }

    return expressionData;
  }

  async fetchSpongEffectsEnrichScores(
    version: number,
    level: "gene" | "transcript",
    module_IDs?: any[],
    cluster: boolean = true,
    average: boolean = false
  ): Promise<any[]> {
    const query: Record<string, any> = {
      sponge_db_version: version,
      cluster,
      average,
    };
    if (module_IDs && module_IDs.length > 0) {
      if (level === "gene") {
        query['spongEffects_gene_module_ID'] = module_IDs.join(',');
      } else {
        query['spongEffects_transcript_module_ID'] = module_IDs.join(',');
      }
    }

    const route = level === "gene"
      ? 'spongEffects/getSpongEffectsGeneModuleScores'
      : 'spongEffects/getSpongEffectsTranscriptModuleScores';

    return (await this.http.getRequest<any[]>(this.getRequestURL(route, query))) ?? [];
  }


  async getSurvivalPValues(
    version: number,
    ensgs: string[],
    disease: Dataset
  ): Promise<SurvivalPValue[]> {
    const route = 'survivalAnalysis/getPValues';

    const query: Query = {
      disease_name: disease.disease_name,
      sponge_db_version: 'any',
      ensg_number: ensgs.join(','),
    };

    return (
      (await this.http.getRequest<SurvivalPValue[] | undefined>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }

  async getSampleInfo(
    dataset_ID?: number,
    disease_name?: string,
    disease_subtype?: string,
    sample_ID?: string,
  ): Promise<PatientInformation[]> {
    const route = 'survivalAnalysis/sampleInformation';
    const query: Query = {
    };
    if (dataset_ID) {
      query['dataset_ID'] = dataset_ID;
    }
    if (disease_name) {
      query['disease_name'] = disease_name;
    }
    if (disease_subtype) {
      query['disease_subtype'] = disease_subtype;
    }
    if (sample_ID) {
      query['sample_ID'] = sample_ID;
    }
    return (
      (await this.http.getRequest<PatientInformation[] | undefined>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }

  // spongEffects services:


  async getSpongEffectsRuns(
    version: number,
    dataset_ID?: number,
    diseaseName?: string
  ): Promise<SpongEffectsRun[]> {
    const route = 'spongEffects/getSpongEffectsRuns';
    const query: Query = {
      sponge_db_version: version,
    };
    if (dataset_ID) {
      query['dataset_ID'] = dataset_ID;
    }
    if (diseaseName) {
      query['disease_name'] = diseaseName;
    }
    return (await this.http.getRequest<SpongEffectsRun[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getRunPerformance(
    version: number,
    diseaseName: string,
    level: string,
    params: { [key: string]: any }
  ): Promise<RunPerformance[]> {

    const route = 'spongEffects/getRunPerformance';
    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
      level: level,
    };

    for (const [key, param] of Object.entries(params)) {
      if (param) {
        query[key] = param;
      }
    }
    return (
      (await this.http.getRequest<RunPerformance[]>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }


  async getRunClassPerformance(
    version: number,
    diseaseName: string,
    level: string,
    params: { [key: string]: any }
  ): Promise<RunClassPerformance[]> {
    const route = 'spongEffects/getRunClassPerformance';

    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
      level: level
    };

    for (const [key, param] of Object.entries(params)) {
      if (param) {
        query[key] = param;
      }
    }

    return (
      (await this.http.getRequest<RunClassPerformance[]>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }

  async getEnrichmentScoreDistributions(
    version: number,
    diseaseName: string,
    level: string,
    params: { [key: string]: any }
  ): Promise<EnrichmentScoreDistributions[]> {
    const route = 'spongEffects/enrichmentScoreDistributions';

    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
      level: level
    };

    for (const [key, param] of Object.entries(params)) {
      if (param) {
        query[key] = param;
      }
    }

    return (
      (await this.http.getRequest<EnrichmentScoreDistributions[]>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }

  async getSpongEffectsGeneModules(
    version: number,
    diseaseName?: string,
    params?: { [key: string]: any },
    limit?: number,
    ensg_number?: string,
    get_best?: boolean
  ): Promise<SpongEffectsGeneModules[]> {
    const route = 'spongEffects/getSpongEffectsGeneModules';

    const query: Query = {
      sponge_db_version: version,
    };
    if (diseaseName) {
      query['disease_name'] = diseaseName;
    }
    if (limit) {
      query['limit'] = limit;
    }
    if (ensg_number) {
      query['ensg_number'] = ensg_number;
    }
    if (get_best !== undefined) {
      query['get_best'] = get_best;
    }
    if (params) {
      for (const [key, param] of Object.entries(params)) {
        if (param) {
          query[key] = param;
        }
      }
    }

    return (
      (await this.http.getRequest<SpongEffectsGeneModules[]>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }

  async getSpongEffectsGeneModuleMembers(
    version: number,
    diseaseName: string,
    ensgNumber?: string,
    geneSymbol?: string,
    limit?: number,
    spongEffects_gene_module_ID?: number
  ): Promise<SpongEffectsGeneModuleMembers[]> {
    const route = 'spongEffects/getSpongEffectsGeneModuleMembers';
    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
    };
    if (spongEffects_gene_module_ID) {
      query['spongEffects_gene_module_ID'] = spongEffects_gene_module_ID;
    }
    if (limit) {
      query['limit'] = limit;
    }
    if (ensgNumber) {
      query['ensg_number'] = ensgNumber;
    }
    if (geneSymbol) {
      query['gene_symbol'] = geneSymbol;
    }
    return (await this.http.getRequest<SpongEffectsGeneModuleMembers[]>(this.getRequestURL(route, query))) ?? [];
  }

  async getSpongEffectsTranscriptModules(
    version: number,
    diseaseName?: string,
    params?: { [key: string]: any },
    limit?: number,
    enst_number?: string
  ): Promise<SpongEffectsTranscriptModules[]> {
    const route = 'spongEffects/getSpongEffectsTranscriptModules';

    const query: Query = {
      sponge_db_version: version,
    };
    if (diseaseName) {
      query['disease_name'] = diseaseName;
    }
    if (limit) {
      query['limit'] = limit;
    }
    if (enst_number) {
      query['enst_number'] = enst_number;
    }
    if (params) {
      for (const [key, param] of Object.entries(params)) {
        if (param) {
          query[key] = param;
        }
      }
    }

    return (
      (await this.http.getRequest<SpongEffectsTranscriptModules[]>(
        this.getRequestURL(route, query)
      )) ?? []
    );
  }

  async getSpongEffectsTranscriptModuleMembers(
    version: number,
    diseaseName: string,
    enstNumber?: string,
    geneSymbol?: string,
    limit?: number,
    spongEffects_transcript_module_ID?: number
  ): Promise<SpongEffectsTranscriptModuleMembers[]> {
    const route = 'spongEffects/getSpongEffectsTranscriptModuleMembers';
    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
    };
    if (spongEffects_transcript_module_ID) {
      query['spongEffects_transcript_module_ID'] = spongEffects_transcript_module_ID;
    }
    if (limit) {
      query['limit'] = limit;
    }
    if (enstNumber) {
      query['enst_number'] = enstNumber;
    }
    if (geneSymbol) {
      query['gene_symbol'] = geneSymbol;
    }
    return (await this.http.getRequest<SpongEffectsTranscriptModuleMembers[]>(this.getRequestURL(route, query))) ?? [];
  }

  predictCancerType(
    version: number,
    file: Blob,
    subtypes: boolean,
    log: boolean,
    mscor: number,
    fdr: number,
    minSize: number,
    maxSize: number,
    minExpr: number,
    method: string,
    model: string | null,
  ): Promise<PredictCancerType> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subtypes', subtypes.toString());
    formData.append('log', log.toString());
    formData.append('mscor', mscor.toString());
    formData.append('fdr', fdr.toString());
    formData.append('min_size', minSize.toString());
    formData.append('max_size', maxSize.toString());
    formData.append('min_expr', minExpr.toString());
    formData.append('method', method);
    if (model) {
      formData.append('model', model);
    }
    const request = `${API_BASE}/spongEffects/predictCancerType?sponge_db_version=${version}`;
    return this.http.postRequest(request, formData);
  }

  getUmapProjection(
    level: string,
    scores: any
  ): Promise<{ user_umap: any; tcga_umap: any }> {
    const request = `${API_BASE}/spongEffects/getUmapProjection`;
    return this.http.postRequest(request, { level, scores });
  }

  getComparisons(version: number) {
    const route = 'comparison';

    const query: Query = {
      sponge_db_version: version,
    };

    return this.http.getRequest<Comparison[]>(this.getRequestURL(route, query));
  }

  async getGeneSets(
    version: number,
    disease1: Dataset | undefined,
    condition1: string,
    disease2: Dataset | undefined,
    condition2: string
  ) {
    const route = 'gseaSets';

    if (!disease1 || !disease2) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      dataset_ID_1: disease1.dataset_ID,
      dataset_ID_2: disease2.dataset_ID,
      condition_1: condition1,
      condition_2: condition2,
    };

    const res = await this.http.getRequest<{ gene_set: string }[]>(
      this.getRequestURL(route, query)
    );
    return (res ?? []).map((e) => e.gene_set).sort();
  }

  async getNetworkResults(
    version: number,
    level: 'gene' | 'transcript' | undefined
  ) {
    const route = 'networkResults';

    if (!level || version < 2) {
      return Promise.resolve(undefined);
    }

    const query: Query = {
      sponge_db_version: version,
      level,
    };

    const resp = await this.http.getRequest<NetworkResult>(
      this.getRequestURL(route, query)
    );
    return resp && 'type' in resp ? resp : undefined;
  }

  async getASPsiValues(
    version: number,
    asEventID: number,
    enst: string,
    disease: Dataset
  ): Promise<ASPsiValue[]> {
    const route = 'alternativeSplicing/getPsiValues';

    const query: Query = {
      alternative_splicing_event_transcripts_ID: asEventID,
      enst_number: enst,
      dataset_ID: disease.dataset_ID,
      sponge_db_version: version,
    };

    const resp = await this.http.getRequest<ASPsiValue[]>(
      this.getRequestURL(route, query)
    );

    return !resp || 'detail' in resp ? [] : resp;
  }

  async getGSEAterms(
    version: number,
    disease1: Dataset | undefined,
    condition1: string,
    disease2: Dataset | undefined,
    condition2: string,
    geneSet: string | undefined
  ) {
    const route = 'gseaTerms';

    if (!disease1 || !disease2 || !geneSet) {
      return Promise.resolve([]);
    }
    const query: Query = {
      sponge_db_version: version,
      dataset_ID_1: disease1.dataset_ID,
      dataset_ID_2: disease2.dataset_ID,
      condition_1: condition1,
      condition_2: condition2,
      gene_set: geneSet,
    };

    const res = await this.http.getRequest<{ term: string }[]>(
      this.getRequestURL(route, query)
    );
    return (res ?? []).map((e) => e.term).sort();
  }

  getGSEAresults(
    version: number,
    disease1: Dataset | undefined,
    condition1: string,
    disease2: Dataset | undefined,
    condition2: string,
    geneSet: string | undefined
  ) {
    const route = 'gseaResults';

    if (!disease1 || !disease2 || !geneSet) {
      return Promise.resolve([]);
    }
    const query: Query = {
      sponge_db_version: version,
      dataset_ID_1: disease1.dataset_ID,
      dataset_ID_2: disease2.dataset_ID,
      condition_1: condition1,
      condition_2: condition2,
      gene_set: geneSet,
    };

    return this.http.getRequest<GseaResult[]>(this.getRequestURL(route, query));
  }

  getGseaPlot(
    version: number,
    disease1: Dataset | undefined,
    condition1: string,
    disease2: Dataset | undefined,
    condition2: string,
    geneSet: string | undefined,
    term: string
  ) {
    const route = 'gseaPlot';

    if (!disease1 || !disease2 || !geneSet) {
      return Promise.resolve(undefined);
    }
    const query: Query = {
      sponge_db_version: version,
      dataset_ID_1: disease1.dataset_ID,
      dataset_ID_2: disease2.dataset_ID,
      condition_1: condition1,
      condition_2: condition2,
      gene_set: geneSet,
      term: term,
    };

    return this.http.getRequest<string>(this.getRequestURL(route, query));
  }

  getDiseaseFromSample(sample_ID?: string): any {
    const route = 'get_disease_from_sample';
    const query: Query = {
    };
    if (sample_ID) {
      query['sample_ID'] = sample_ID;
    }
    return this.http.getRequest<string>(this.getRequestURL(route, query));
  }

  private stringify(query: Query): string {
    return Object.keys(query)
      .filter(key => query[key] !== undefined && query[key] !== null)
      .map((key) => {
        const value = query[key];
        if (Array.isArray(value)) {
          return value
            .map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
            .join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .join('&');
  }

  private getRequestURL(route: string, query: Query): string {
    return `${API_BASE}/${route}?${this.stringify(query)}`;
  }

}
