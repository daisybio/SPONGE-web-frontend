import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {
  BrowseQuery,
  CeRNA,
  CeRNAExpression,
  CeRNAInteraction,
  Dataset,
  Gene,
  GeneCount,
  GeneInfo,
  GOTerm,
  Hallmark,
  OverallCounts,
  RunInfo,
  SurvivalPValue,
  SurvivalRate,
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

  getCeRNA(version: number, query: BrowseQuery): Promise<CeRNA[]> {
    const route = 'findceRNA';

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

    return this.http.getRequest<CeRNA[]>(this.getRequestURL(route, internalQuery));
  }

  async getGeneInteractionsAll(version: number, disease: Dataset | undefined, maxPValue: number, ensgs: string[]): Promise<CeRNAInteraction[]> {
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

    const results: CeRNAInteraction[] = []
    const limit = 1000;
    let offset = 0;

    let data: CeRNAInteraction[];

    do {
      data = await this.http.getRequest<CeRNAInteraction[]>(this.getRequestURL(route, {
        ...query,
        limit,
        offset
      }));
      results.push(...data);
      offset += limit;
    } while (data.length === limit);

    return results;
  }

  getGeneInteractionsSpecific(version: number, disease: Dataset, maxPValue: number, ensgs: string[]): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findSpecific';

    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      ensg_number: ensgs.join(','),
      pValue: maxPValue
    }

    return this.http.getRequest<CeRNAInteraction[]>(this.getRequestURL(route, query));
  }

  async getGeneExpression(version: number, ensgs: string[], disease: Dataset): Promise<CeRNAExpression[]> {
    const route = 'exprValue/getceRNA';

    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      dataset_ID: disease.dataset_ID,
      ensg_number: ensgs.join(',')
    }

    return await this.http.getRequest<CeRNAExpression[]>(this.getRequestURL(route, query));
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

  private stringify(query: Query): string {
    return Object.keys(query).map(key => key + '=' + query[key]).join('&');
  }

  private getRequestURL(route: string, query: Query): string {
    return `${BackendService.API_BASE}/${route}?${this.stringify(query)}`;
  }
}
