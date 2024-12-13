import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {
  BrowseQuery,
  Dataset,
  Gene,
  GeneCount,
  GeneExpression,
  GeneInfo,
  GeneInteraction,
  GeneNode,
  GOTerm,
  Hallmark,
  OverallCounts,
  RunInfo,
  SurvivalPValue,
  SurvivalRate,
  TranscriptExpression,
  TranscriptInfo,
  TranscriptInteraction,
  TranscriptNode,
  WikiPathway
} from "../interfaces";

interface Query {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private static API_BASE = 'https://exbio.wzw.tum.de/sponge-api-v2'

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

    if (version != query.dataset.sponge_db_version) {
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
      limit: query.maxGenes
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

  async getAlternativeSplicingEvents(enst: string): Promise<string[]> {
    const route = 'alternativeSplicing/getTranscriptEvents';

    const query: Query = {
      enst_number: enst
    }

    const data = await this.http.getRequest<{ event_type: string; }[]>(this.getRequestURL(route, query));
    return data.map(d => d.event_type);
  }

  private stringify(query: Query): string {
    return Object.keys(query).map(key => key + '=' + query[key]).join('&');
  }

  private getRequestURL(route: string, query: Query): string {
    return `${BackendService.API_BASE}/${route}?${this.stringify(query)}`;
  }
}
