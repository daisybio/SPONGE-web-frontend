import {Injectable, Signal} from '@angular/core';
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
import {VersionsService} from "./versions.service";

interface Query {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private static API_BASE = 'https://exbio.wzw.tum.de/sponge-api-v2'
  version: Signal<number>;

  constructor(private http: HttpService, versionsService: VersionsService) {
    this.version = versionsService.versionReadOnly();
  }

  getDatasets(diseaseName?: string): Promise<Dataset[]> {
    const route = 'dataset';

    const query: Query = {sponge_db_version: this.version()};
    if (diseaseName) {
      query['disease'] = diseaseName;
    }

    return this.http.getRequest<Dataset[]>(this.getRequestURL(route, query));
  }

  getDatasetInfo(diseaseName: string): Promise<RunInfo[]> {
    const route = 'dataset/spongeRunInformation';
    const query: Query = {sponge_db_version: this.version(), disease_name: diseaseName};
    return this.http.getRequest<RunInfo[]>(this.getRequestURL(route, query));
  }

  getOverallCounts(): Promise<OverallCounts[]> {
    const route = 'getOverallCounts';
    const query: Query = {sponge_db_version: this.version()};
    return this.http.getRequest<OverallCounts[]>(this.getRequestURL(route, query));
  }

  getCeRNA(query: CeRNAQuery): Promise<CeRNA[]> {
    const route = 'findceRNA';

    const internalQuery: Query = {
      sponge_db_version: this.version(),
      disease_name: query.disease.disease_name,
      minBetweenness: query.minBetweenness,
      minNodeDegree: query.minDegree,
      minEigenvector: query.minEigen,
      sorting: query.geneSorting,
      descending: true,
      limit: query.maxGenes
    };

    return this.http.getRequest<CeRNA[]>(this.getRequestURL(route, internalQuery));
  }

  getCeRNAInteractionsAll(disease: string, maxPValue: number, ensgs: string[], limit?: number, offset?: number): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findAll';

    const query: Query = {
      sponge_db_version: this.version(),
      disease_name: disease,
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

  getCeRNAInteractionsSpecific(disease: string, maxPValue: number, ensgs: string[]): Promise<CeRNAInteraction[]> {
    const route = 'ceRNAInteraction/findSpecific';
    const query: Query = {
      sponge_db_version: this.version(),
      disease_name: disease,
      ensg_number: ensgs.join(','),
      pValue: maxPValue
    }

    return this.http.getRequest<CeRNAInteraction[]>(this.getRequestURL(route, query));
  }

  getCeRNAExpression(ensgs: string[], diseaseName: string): Promise<CeRNAExpression[]> {
    const route = 'exprValue/getceRNA';

    const query: Query = {
      sponge_db_version: this.version(),
      disease_name: diseaseName,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<CeRNAExpression[]>(this.getRequestURL(route, query));
  }

  getSurvivalRates(ensgs: string[], diseaseName: string): Promise<SurvivalRate[]> {
    const route = 'survivalAnalysis/getRates';
    const query: Query = {
      sponge_db_version: this.version(),
      disease_name: diseaseName,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<SurvivalRate[]>(this.getRequestURL(route, query));
  }

  getSurvivalPValues(ensgs: string[], diseaseName: string): Promise<SurvivalPValue[]> {
    const route = 'survivalAnalysis/getPValues';

    const query: Query = {
      sponge_db_version: this.version(),
      disease_name: diseaseName,
      ensg_number: ensgs.join(',')
    }

    return this.http.getRequest<SurvivalPValue[]>(this.getRequestURL(route, query));
  }

  getAutocomplete(query: string): Promise<Gene[]> {
    if (query.length < 2) {
      return Promise.resolve([]);
    }

    const route = 'stringSearch';
    const queryObj: Query = {
      searchString: query
    }
    try {
      return this.http.getRequest<Gene[]>(this.getRequestURL(route, queryObj));
    } catch (e) {
      return Promise.resolve([]);
    }
  }

  getGeneCount(ensgs: string[], onlySignificant: boolean): Promise<GeneCount[]> {
    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }
    const route = 'getGeneCount';
    const query: Query = {
      sponge_db_version: this.version(),
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
