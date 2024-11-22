import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {Dataset, OverallCounts} from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private static API_BASE = 'https://exbio.wzw.tum.de/sponge-api'

  constructor(private http: HttpService) {
  }

  getDatasets(diseaseName?: string): Promise<Dataset[]> {
    const request = BackendService.API_BASE + '/dataset' + (diseaseName ? `?disease=${diseaseName}` : '');
    return this.http.getRequest(request);
  }

  getOverallCounts(): Promise<OverallCounts[]> {
    const request = BackendService.API_BASE + '/getOverallCounts';
    return this.http.getRequest(request);
  }
}
