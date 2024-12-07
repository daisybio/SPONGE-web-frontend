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

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private static API_BASE = 'https://exbio.wzw.tum.de/sponge-api-v2'

  constructor(private http: HttpService) {
  }

  getDatasets(diseaseName?: string): Promise<Dataset[]> {
    const request = BackendService.API_BASE + '/dataset' + (diseaseName ? `?disease=${diseaseName}` : '');
    return this.http.getRequest<Dataset[]>(request);
  }

  getDatasetInfo(diseaseName: string): Promise<RunInfo[]> {
    const request = BackendService.API_BASE + '/dataset/spongeRunInformation?disease_name=' + diseaseName;
    return this.http.getRequest<RunInfo[]>(request);
  }

  getOverallCounts(): Promise<OverallCounts[]> {
    const request = BackendService.API_BASE + '/getOverallCounts';
    return this.http.getRequest<OverallCounts[]>(request);
  }

  getCeRNA(query: CeRNAQuery): Promise<CeRNA[]> {
    let request = BackendService.API_BASE + '/findceRNA?disease_name=' + query.disease.disease_name;

    request += `&minBetweenness=${query.minBetweenness}`;
    request += `&minNodeDegree=${query.minDegree}`;
    request += `&minEigenvector=${query.minEigen}`;
    request += `&sorting=${query.geneSorting}`;
    request += `&descending=${true}`;
    request += `&limit=${query.maxGenes}`;

    return this.http.getRequest<CeRNA[]>(request);
  }

  getCeRNAInteractionsAll(disease: string, maxPValue: number, ensgs: string[], limit?: number, offset?: number): Promise<CeRNAInteraction[]> {
    let request = BackendService.API_BASE + '/ceRNAInteraction/findAll?disease_name=' + disease;
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
    let request = BackendService.API_BASE + '/ceRNAInteraction/findSpecific?disease_name=' + disease;
    request += `&ensg_number=${ensgs.join(',')}`;
    request += `&pValue=${maxPValue}`;

    return this.http.getRequest<CeRNAInteraction[]>(request);
  }

  getCeRNAExpression(ensgs: string[], diseaseName: string): Promise<CeRNAExpression[]> {
    let request = BackendService.API_BASE + '/exprValue/getceRNA?disease_name=' + diseaseName;
    request += `&ensg_number=${ensgs.join(',')}`;

    return this.http.getRequest<CeRNAExpression[]>(request);
  }

  getSurvivalRates(ensgs: string[], diseaseName: string): Promise<SurvivalRate[]> {
    let request = BackendService.API_BASE + '/survivalAnalysis/getRates?disease_name=' + diseaseName;
    request += `&ensg_number=${ensgs.join(',')}`;

    return this.http.getRequest<SurvivalRate[]>(request);
  }

  getSurvivalPValues(ensgs: string[], diseaseName: string): Promise<SurvivalPValue[]> {
    let request = BackendService.API_BASE + '/survivalAnalysis/getPValues?disease_name=' + diseaseName;
    request += `&ensg_number=${ensgs.join(',')}`;

    return this.http.getRequest<SurvivalPValue[]>(request);
  }

  getAutocomplete(query: string): Promise<Gene[]> {
    if (query.length < 2) {
      return Promise.resolve([]);
    }
    const request = BackendService.API_BASE + '/stringSearch?searchString=' + query;
    try {
      return this.http.getRequest<Gene[]>(request);
    } catch (e) {
      return Promise.resolve([]);
    }
  }

  getGeneCount(ensgs: string[], onlySignificant: boolean): Promise<GeneCount[]> {
    if (ensgs.length === 0) {
      return Promise.resolve([]);
    }
    let request = BackendService.API_BASE + '/getGeneCount?ensg_number=' + ensgs.join(',');
    if (onlySignificant) {
      request += '&minCountSign=1';
    }
    return this.http.getRequest<GeneCount[]>(request);
  }
}
