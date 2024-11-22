import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {CeRNA, CeRNAInteraction, CeRNAQuery, Dataset, OverallCounts, RunInfo} from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private static API_BASE = 'https://exbio.wzw.tum.de/sponge-api'

  constructor(private http: HttpService) {
  }

  getDatasets(diseaseName?: string): Promise<Dataset[]> {
    const request = BackendService.API_BASE + '/dataset' + (diseaseName ? `?disease=${diseaseName}` : '');
    return this.http.getRequest<Dataset[]>(request);
  }

  getDatasetInfo(diseaseName: string): Promise<RunInfo[]> {
    const request = BackendService.API_BASE + '/dataset/runInformation?disease_name=' + diseaseName;
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


  getCeRNAInteractions(config: CeRNAQuery, ensgs: string[]): Promise<CeRNAInteraction[]> {
    let request = BackendService.API_BASE + '/ceRNAInteraction/findSpecific?disease_name=' + config.disease.disease_name;
    request += `&ensg_number=${ensgs.join(',')}`;
    request += `&pValue=${config.maxPValue}`;

    return this.http.getRequest<CeRNAInteraction[]>(request);
  }
}
