import {Injectable} from '@angular/core';
import {HttpService} from "./http.service";
import {VersionService} from "./version.service";
import {
  Dataset,
  DatasetInfo,
  EnrichmentScoreDistributions,
  OverallCounts,
  PlotData,
  RunClassPerformance,
  RunPerformance,
  SpongEffectsGeneModules,
  SpongEffectsGeneModuleMembers,
  SpongEffectsTranscriptModules,
  PredictCancerType,
  SpongEffectsTranscriptModuleMembers,
  CeRNAInteraction,
  CeRNAQuery,
  CeRNA,
  CeRNAExpression,
  SurvivalRate, GeneCount, SurvivalPValue, Gene, TranscriptExpression
} from "../interfaces";


@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private static API_BASE = 'https://exbio.wzw.tum.de/sponge-api'

  constructor(private http: HttpService, private versionService: VersionService) {
  }

  getDatasets(diseaseName?: string): Promise<Dataset[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = BackendService.API_BASE + '/dataset' + (diseaseName ? `?disease_name=${diseaseName}` : '') + `&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<Dataset[]>(request);
  }

  getDatasetsInformation(dataOrigin: string): Promise<DatasetInfo[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = BackendService.API_BASE + '/datasets' + `?data_origin=${dataOrigin}` + `&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<DatasetInfo[]>(request);
  }

  getOverallCounts(): Promise<OverallCounts[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = BackendService.API_BASE + '/getOverallCounts' + `?sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<OverallCounts[]>(request);
  }


  getCeRNA(query: CeRNAQuery): Promise<CeRNA[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    let request = BackendService.API_BASE + '/findceRNA?disease_name=' + query.disease.disease_name + `?sponge_db_version=${sponge_db_version}`;

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

  getTranscriptExpression(ensts: string[], disease_name?: string): Promise<TranscriptExpression[]> {
    let request = BackendService.API_BASE + `/exprValue/getTranscript?disease_name=${disease_name}`;
    request += `&enst_number=${ensts.join(',')}`;

    return this.http.getRequest<TranscriptExpression[]>(request);
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


// spongEffects services:

  getRunPerformance(diseaseName: string, level: string): Promise<RunPerformance[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = BackendService.API_BASE + '/spongEffects/getRunPerformance' + `?disease_name=${diseaseName}` + `&level=${level}` + `&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<RunPerformance[]>(request);
  }

  getRunClassPerformance(diseaseName: string, level: string): Promise<RunClassPerformance[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = BackendService.API_BASE + '/spongEffects/getRunClassPerformance' + `?disease_name=${diseaseName}` + `&level=${level}` + `&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<RunClassPerformance[]>(request);
  }

  getEnrichmentScoreDistributions(diseaseName: string, level: string): Promise<EnrichmentScoreDistributions[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = `${BackendService.API_BASE}/spongEffects/getEnrichmentScoreDistributions?disease_name=${diseaseName}&level=${level}&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<EnrichmentScoreDistributions[]>(request);
  }

  getSpongEffectsGeneModules(diseaseName: string): Promise<SpongEffectsGeneModules[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = `${BackendService.API_BASE}/spongEffects/getSpongEffectsGeneModules?disease_name=${diseaseName}&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<SpongEffectsGeneModules[]>(request);
  }

  getSpongEffectsGeneModuleMembers(diseaseName: string, ensgNumber?: string, geneSymbol?: string): Promise<SpongEffectsGeneModuleMembers[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    let request = `${BackendService.API_BASE}/spongEffects/getSpongEffectsGeneModuleMembers?disease_name=${diseaseName}&sponge_db_version=${sponge_db_version}`;
    if (ensgNumber) {
      request += `&ensg_number=${ensgNumber}`;
    }
    if (geneSymbol) {
      request += `&gene_symbol=${geneSymbol}`;
    }
    return this.http.getRequest<SpongEffectsGeneModuleMembers[]>(request);
  }

  getSpongEffectsTranscriptModules(diseaseName: string): Promise<SpongEffectsTranscriptModules[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    const request = `${BackendService.API_BASE}/spongEffects/getSpongEffectsTranscriptModules?disease_name=${diseaseName}&sponge_db_version=${sponge_db_version}`;
    return this.http.getRequest<SpongEffectsTranscriptModules[]>(request);
  }

  getSpongEffectsTranscriptModuleMembers(diseaseName: string, enstNumber?: string): Promise<SpongEffectsTranscriptModuleMembers[]> {
    const sponge_db_version = this.versionService.getCurrentVersion();
    let request = `${BackendService.API_BASE}/spongEffects/getSpongEffectsTranscriptModuleMembers?disease_name=${diseaseName}&sponge_db_version=${sponge_db_version}`;
    if (enstNumber) {
      request += `&enst_number=${enstNumber}`;
    }
    return this.http.getRequest<SpongEffectsTranscriptModuleMembers[]>(request);
  }

  predictCancerType(file: File, subtypes: boolean, log: boolean, mscor: number, fdr: number, minSize: number, maxSize: number, minExpr: number, method: string): Promise<PredictCancerType> {
    const sponge_db_version = this.versionService.getCurrentVersion();
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
    const request = `${BackendService.API_BASE}/spongEffects/predictCancerType?sponge_db_version=${sponge_db_version}`;
    return this.http.postRequest(request, formData);
  }

}
