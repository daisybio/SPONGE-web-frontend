import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {
  CeRNA,
  CeRNAExpression,
  CeRNAInteraction,
  CeRNAQuery,
  Dataset,
  Gene,
  GeneCount,
  OverallCounts,
  RunInfo,
  SurvivalPValue,
  SurvivalRate
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

  getDatasets(version: number, diseaseName?: string): Promise<Dataset[]> {
    const route = 'dataset';

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

  getCeRNA(version: number, query: CeRNAQuery): Promise<CeRNA[]> {
    const route = 'findceRNA';

    if (version != query.dataset.sponge_db_version) {
      return Promise.resolve([]);
    }

    const internalQuery: Query = {
      sponge_db_version: version,
      disease_name: query.dataset.disease_name,
      minBetweenness: query.minBetweenness,
      minNodeDegree: query.minDegree,
      minEigenvector: query.minEigen,
      sorting: query.geneSorting,
      descending: true,
      limit: query.maxGenes
    };

    return this.http.getRequest<CeRNA[]>(this.getRequestURL(route, internalQuery));
  }

  getCeRNAInteractionsAll(version: number, disease: Dataset | undefined, maxPValue: number, ensgs: string[], limit?: number, offset?: number): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findAll';

    if (ensgs.length === 0 || !disease || version != disease.sponge_db_version) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease.disease_name,
      ensg_number: ensgs.join(','),
      pValue: maxPValue
    }

    if (limit) {
      query['limit'] = limit;
    }
    if (offset) {
      query['offset'] = offset;
    }

    return this.http.getRequest<CeRNAInteraction[]>(this.getRequestURL(route, query));
  }

  getCeRNAInteractionsSpecific(version: number, disease: string, maxPValue: number, ensgs: string[]): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findSpecific';

    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: disease,
      ensg_number: ensgs.join(','),
      pValue: maxPValue
    }

    return this.http.getRequest<CeRNAInteraction[]>(this.getRequestURL(route, query));
  }

  getCeRNAExpression(version: number, ensgs: string[], diseaseName: string): Promise<CeRNAExpression[]> {
    const route = 'exprValue/getceRNA';

    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }

    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<CeRNAExpression[]>(this.getRequestURL(route, query));
  }

  getSurvivalRates(version: number, ensgs: string[], diseaseName: string): Promise<SurvivalRate[]> {
    const route = 'survivalAnalysis/getRates';
    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<SurvivalRate[]>(this.getRequestURL(route, query));
  }

  getSurvivalPValues(version: number, ensgs: string[], diseaseName: string): Promise<SurvivalPValue[]> {
    const route = 'survivalAnalysis/getPValues';

    const query: Query = {
      sponge_db_version: version,
      disease_name: diseaseName,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<SurvivalPValue[]>(this.getRequestURL(route, query));
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
