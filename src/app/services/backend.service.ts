import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {
  AlternativeSplicingEvent,
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
  GeneSet,
  GOTerm,
  Hallmark,
  NetworkResult,
  OverallCounts,
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
  TranscriptExpression,
  TranscriptInfo,
  TranscriptInteraction,
  TranscriptMiRNA,
  TranscriptNode,
  WikiPathway
} from "../interfaces";
import {API_BASE} from "../constants";

interface Query {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(private http: HttpService) {
  }

  async getDatasets(version: number, diseaseName?: string): Promise<Dataset[]> {
    const route = 'datasets';

    const query: Query = {
      sponge_db_version: version
    };

    if (diseaseName) {
      query['disease'] = diseaseName;
    }

    return this.http.getRequest<Dataset[]>(this.getRequestURL(route, query));
  }

  getDatasetInfo(version: number, diseaseName: string): Promise<RunInfo[]> {
    const route = 'dataset/spongeRunInformation';
    const query: Query = {sponge_db_version: version, disease_name: diseaseName};
    return this.http.getRequest<RunInfo[]>(this.getRequestURL(route, query));
  }

  getOverallCounts(version: number): Promise<OverallCounts[]> {
    const route = 'getOverallCounts';
    const query: Query = {sponge_db_version: version};
    return this.http.getRequest<OverallCounts[]>(this.getRequestURL(route, query));
  }

  getNodes(version: number, query: BrowseQuery): Promise<(GeneNode | TranscriptNode)[]> {
    const level = query.level;
    const route = level == 'gene' ? 'findceRNA' : 'findceRNATranscripts';

    if (version != query.dataset.sponge_db_version || (version < 2 && level == 'transcript')) {
      return Promise.resolve([]);
    }

    const internalQuery: Query = {
      sponge_db_version: version,
      disease_name: query.dataset.disease_name,
      dataset_ID: query.dataset.dataset_ID,
      minBetweenness: query.minBetweenness,
      minNodeDegree: query.minDegree,
      minEigenvector: query.minEigen,
      sorting: query.geneSorting,
      descending: true,
      limit: query.maxNodes
    };

    return this.http.getRequest<(GeneNode | TranscriptNode)[]>(this.getRequestURL(route, internalQuery));
  }

  async getGeneInteractionsAll(version: number, disease: Dataset | undefined, maxPValue: number, ensgs: string[]): Promise<GeneInteraction[]> {
    const route = 'ceRNAInteraction/findAll';

    if (ensgs.length === 0 || !disease || version != disease.sponge_db_version) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      ensg_number: ensgs.join(','),
      pValue: maxPValue
    }

    const results: GeneInteraction[] = []
    const limit = 1000;
    let offset = 0;

    let data: GeneInteraction[];

    do {
      data = await this.http.getRequest<GeneInteraction[]>(this.getRequestURL(route, {
        ...query,
        limit,
        offset
      }));
      results.push(...data);
      offset += limit;
    } while (data.length === limit);

    return results;
  }

  getInteractionsSpecific(version: number, disease: Dataset, maxPValue: number, identifiers: string[], level: 'gene' | 'transcript'): Promise<(GeneInteraction | TranscriptInteraction)[]> {
    const route = level == 'gene' ? 'ceRNAInteraction/findSpecific' : 'ceRNAInteraction/findSpecificTranscripts';

    if (identifiers.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      pValue: maxPValue
    }

    if (level == 'gene') {
      query['ensg_number'] = identifiers.join(',');
    } else {
      query['enst_number'] = identifiers.join(',');
    }

    return this.http.getRequest<(GeneInteraction | TranscriptInteraction)[]>(this.getRequestURL(route, query));
  }

  async getExpression(version: number, identifiers: string[], disease: Dataset, level: 'gene' | 'transcript'): Promise<(GeneExpression | TranscriptExpression)[]> {
    const route = level == 'gene' ? 'exprValue/getceRNA' : 'exprValue/getTranscriptExpr';

    if (identifiers.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      dataset_ID: disease.dataset_ID
    }

    if (level == 'gene') {
      query['ensg_number'] = identifiers.join(',');
    } else {
      query['enst_number'] = identifiers.join(',');
    }

    return await this.http.getRequest<(GeneExpression | TranscriptExpression)[]>(this.getRequestURL(route, query));
  }

  getSurvivalRates(version: number, ensgs: string[], disease: Dataset): Promise<SurvivalRate[]> {
    const route = 'survivalAnalysis/getRates';
    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<SurvivalRate[]>(this.getRequestURL(route, query));
  }


  getAutocomplete(version: number, query: string): Promise<Gene[]> {
    if (query.length < 2) {
      return Promise.resolve([]);
    }

    const route = 'stringSearch';
    const queryObj: Query = {
      sponge_db_version: version,
      searchString: query
    }
    try {
      return this.http.getRequest<Gene[]>(this.getRequestURL(route, queryObj));
    } catch (e) {
      return Promise.resolve([]);
    }
  }

  getTranscriptInfo(version: number, enst: string): Promise<TranscriptInfo[]> {
    const route = 'getTranscriptInformation';
    const query: Query = {
      sponge_db_version: version,
      enst_number: enst
    }
    return this.http.getRequest<TranscriptInfo[]>(this.getRequestURL(route, query));
  }

  getGeneInfo(version: number, ensg: string): Promise<GeneInfo[]> {
    const route = 'getGeneInformation';
    const query: Query = {
      sponge_db_version: version,
      ensg_number: ensg
    }
    return this.http.getRequest<GeneInfo[]>(this.getRequestURL(route, query));
  }

  getGOterms(version: number, symbol: string | undefined): Promise<GOTerm[]> {
    const route = 'getGeneOntology';

    if (!symbol) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      gene_symbol: symbol
    }
    return this.http.getRequest<GOTerm[]>(this.getRequestURL(route, query));
  }

  async getHallmark(version: number, symbol: string | undefined): Promise<Hallmark[]> {
    const route = 'getHallmark';

    if (!symbol) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      gene_symbol: symbol
    }
    const hallmarks = await this.http.getRequest<Hallmark[] | {}>(this.getRequestURL(route, query));
    if (!Array.isArray(hallmarks)) {
      return [];
    }
    return hallmarks;
  }

  async getWikiPathways(version: number, symbol: string | undefined): Promise<WikiPathway[]> {
    const route = 'getWikipathway';

    if (!symbol) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      gene_symbol: symbol
    }
    const wikipathways = await this.http.getRequest<WikiPathway[] | {}>(this.getRequestURL(route, query));

    if (!Array.isArray(wikipathways)) {
      return [];
    }
    return wikipathways;
  }

  getGeneCount(version: number, ensgs: string[], onlySignificant: boolean): Promise<GeneCount[]> {
    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }
    const route = 'getGeneCount';
    const query: Query = {
      sponge_db_version: version,
      ensg_number: ensgs.join(','),
    }
    if (onlySignificant) {
      query['minCountSign'] = 1;
    }
    return this.http.getRequest<GeneCount[]>(this.getRequestURL(route, query));
  }

  async getGeneTranscripts(version: number, ensg: string): Promise<string[]> {
    const route = 'getGeneTranscripts';
    const query: Query = {
      sponge_db_version: version,
      ensg_number: ensg
    }
    return this.http.getRequest<string[]>(this.getRequestURL(route, query));
  }

  async getMiRNAs(version: number, disease: Dataset, identifiers: [string, string], level: 'gene' | 'transcript') {
    const route = level == 'gene' ? 'miRNAInteraction/findceRNA' : 'miRNAInteraction/findceRNATranscripts';

    const query: Query = {
      sponge_db_version: version,
      dataset_ID: disease.dataset_ID,
      between: true
    }
    if (level == 'gene') {
      query['ensg_number'] = identifiers.join(',');
    } else {
      query['enst_number'] = identifiers.join(',');
    }

    return this.http.getRequest<GeneMiRNA[] | TranscriptMiRNA[]>(this.getRequestURL(route, query));
  }

  async getAlternativeSplicingEvents(ensts: string[]): Promise<AlternativeSplicingEvent[]> {
    const route = 'alternativeSplicing/getTranscriptEvents';

    const query: Query = {
      enst_number: ensts.join(',')
    }

    const resp = await this.http.getRequest<AlternativeSplicingEvent[]>(this.getRequestURL(route, query));
    return 'detail' in resp ? [] : resp;
  }

  getCeRNAInteractionsAll(disease: string, maxPValue: number, ensgs: string[], limit?: number, offset?: number): Promise<CeRNAInteraction[]> {
    let request = API_BASE + '/ceRNAInteraction/findAll?disease_name=' + disease;
    request += `&ensg_number=${ensgs.join(',')}`;
    request += `&pValue=${maxPValue}`;

    if (limit) {
      request += `&limit=${limit}`;
    }
    if (offset) {
      request += `&offset=${offset}`;
    }

    return this.http.getRequest<CeRNAInteraction[]>(request);
  }

  getCeRNAInteractionsSpecific(disease: string, maxPValue: number, ensgs: string[]): Promise<CeRNAInteraction[]> {
    let request = API_BASE + '/ceRNAInteraction/findSpecific?disease_name=' + disease;
    request += `&ensg_number=${ensgs.join(',')}`;
    request += `&pValue=${maxPValue}`;

    return this.http.getRequest<CeRNAInteraction[]>(request);
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

  getCeRNAExpression(ensgs: string[], diseaseName: string): Promise<CeRNAExpression[]> {
    let request = API_BASE + '/exprValue/getceRNA?disease_name=' + diseaseName;
    request += `&ensg_number=${ensgs.join(',')}`;

    return this.http.getRequest<CeRNAExpression[]>(request);
  }

  getTranscriptExpression(ensts: string[], disease_name?: string): Promise<TranscriptExpression[]> {
    let request = API_BASE + `/exprValue/getTranscript?disease_name=${disease_name}`;
    request += `&enst_number=${ensts.join(',')}`;

    return this.http.getRequest<TranscriptExpression[]>(request);
  }

  async getSurvivalPValues(version: number, ensgs: string[], disease: Dataset): Promise<SurvivalPValue[]> {
    const route = 'survivalAnalysis/getPValues';

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      ensg_number: ensgs.join(',')
    }

    return (await this.http.getRequest<SurvivalPValue[] | undefined>(this.getRequestURL(route, query))) ?? [];
  }

  getSpongEffectsRuns(version: number, dataset_ID?: number, diseaseName?: string): Promise<SpongEffectsRun[]> {
    const request = `${API_BASE}/spongEffects/getSpongEffectsRuns?`
      + (dataset_ID ? `?dataset_ID=${dataset_ID}` : '')
      + (diseaseName ? `&disease_name=${diseaseName}` : '')
      + `&sponge_db_version=${version}`
    return this.http.getRequest<SpongEffectsRun[]>(request);
  }

  getRunPerformance(version: number, diseaseName: string, level: string): Promise<RunPerformance[]> {
    const request = API_BASE + '/spongEffects/getRunPerformance' + `?disease_name=${diseaseName}` + `&level=${level}` + `&sponge_db_version=${version}`;
    return this.http.getRequest<RunPerformance[]>(request);
  }


// spongEffects services:

  getRunClassPerformance(version: number, diseaseName: string, level: string): Promise<RunClassPerformance[]> {
    const request = API_BASE + '/spongEffects/getRunClassPerformance' + `?disease_name=${diseaseName}` + `&level=${level}` + `&sponge_db_version=${version}`;
    return this.http.getRequest<RunClassPerformance[]>(request);
  }

  getEnrichmentScoreDistributions(version: number, diseaseName: string, level: string): Promise<EnrichmentScoreDistributions[]> {
    const request = `${API_BASE}/spongEffects/getEnrichmentScoreDistributions?disease_name=${diseaseName}&level=${level}&sponge_db_version=${version}`;
    return this.http.getRequest<EnrichmentScoreDistributions[]>(request);
  }

  getSpongEffectsGeneModules(version: number, diseaseName: string): Promise<SpongEffectsGeneModules[]> {
    const request = `${API_BASE}/spongEffects/getSpongEffectsGeneModules?disease_name=${diseaseName}&sponge_db_version=${version}`;
    return this.http.getRequest<SpongEffectsGeneModules[]>(request);
  }

  getSpongEffectsGeneModuleMembers(version: number, diseaseName: string, ensgNumber?: string, geneSymbol?: string): Promise<SpongEffectsGeneModuleMembers[]> {
    let request = `${API_BASE}/spongEffects/getSpongEffectsGeneModuleMembers?disease_name=${diseaseName}&sponge_db_version=${version}`;
    if (ensgNumber) {
      request += `&ensg_number=${ensgNumber}`;
    }
    if (geneSymbol) {
      request += `&gene_symbol=${geneSymbol}`;
    }
    return this.http.getRequest<SpongEffectsGeneModuleMembers[]>(request);
  }

  getSpongEffectsTranscriptModules(version: number, diseaseName: string): Promise<SpongEffectsTranscriptModules[]> {
    const request = `${API_BASE}/spongEffects/getSpongEffectsTranscriptModules?disease_name=${diseaseName}&sponge_db_version=${version}`;
    return this.http.getRequest<SpongEffectsTranscriptModules[]>(request);
  }

  getSpongEffectsTranscriptModuleMembers(version: number, diseaseName: string, enstNumber?: string): Promise<SpongEffectsTranscriptModuleMembers[]> {
    let request = `${API_BASE}/spongEffects/getSpongEffectsTranscriptModuleMembers?disease_name=${diseaseName}&sponge_db_version=${version}`;
    if (enstNumber) {
      request += `&enst_number=${enstNumber}`;
    }
    return this.http.getRequest<SpongEffectsTranscriptModuleMembers[]>(request);
  }

  predictCancerType(version: number, file: Blob, subtypes: boolean, log: boolean, mscor: number, fdr: number, minSize: number, maxSize: number, minExpr: number, method: string): Promise<PredictCancerType> {
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
    const request = `${API_BASE}/spongEffects/predictCancerType?sponge_db_version=${version}`;
    return this.http.postRequest(request, formData);
  }

  getComparisons(version: number) {
    const route = 'comparison';

    const query: Query = {
      sponge_db_version: version
    }

    return this.http.getRequest<Comparison[]>(this.getRequestURL(route, query));
  }

  async getGeneSets(version: number, disease1: Dataset | undefined, condition1: string, disease2: Dataset | undefined, condition2: string) {
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
    }

    const res = await this.http.getRequest<GeneSet[]>(this.getRequestURL(route, query));
    return res.map(e => e.gene_set).sort();
  }

  async getNetworkResults(version: number, level: 'gene' | 'transcript' | undefined) {
    const route = 'networkResults';

    if (!level || version < 2) {
      return Promise.resolve(undefined);
    }

    const query: Query = {
      sponge_db_version: version,
      level
    }

    const resp = await this.http.getRequest<NetworkResult>(this.getRequestURL(route, query));
    return 'type' in resp ? resp : undefined;
  }

  async getASPsiValues(asEventID: number, enst: string) {
    const route = 'alternativeSplicing/getPsiValues';

    const query: Query = {
      alternative_splicing_event_transcripts_ID: asEventID,
      enst_number: enst
    }

    return this.http.getRequest<number>(this.getRequestURL(route, query));
  }

  async getGSEAterms(version: number, disease1: Dataset | undefined, condition1: string, disease2: Dataset | undefined, condition2: string, geneSet: string | undefined) {
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
      gene_set: geneSet
    }

    const res = await this.http.getRequest<{ term: string }[]>(this.getRequestURL(route, query));
    return res.map(e => e.term).sort();
  }

  private stringify(query: Query): string {
    return Object.keys(query).map(key => key + '=' + query[key]).join('&');
  }

  private getRequestURL(route: string, query: Query): string {
    return `${API_BASE}/${route}?${this.stringify(query)}`;
  }
}
