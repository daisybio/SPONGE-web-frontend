import { Component, computed, effect, ElementRef, inject, input, resource, signal, viewChild, ViewChild } from '@angular/core';
import { BackendService } from '../../../../services/backend.service';
import { exportToCSV } from '../../../../utils/export';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import { HeatmapDataSource } from '../../../../components/heatmap-plot/heatmap-plot.component';
import { ModuleMember, SpongEffectsRun, SpongEffectsModule, Gene, Transcript } from '../../../../interfaces';
import { InfoService } from '../../../../services/info.service';
import { VersionsService } from '../../../../services/versions.service';
import { ExploreService } from '../../explore/service/explore.service';
import { ModalsService } from '../../../../components/modals-service/modals.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { InfoComponent } from '../../../../components/info/info.component';
import { PredictService } from '../service/predict.service';
import { CartService } from '../../../../services/cart.service';
import { capitalize } from "lodash";
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddToCartButtonComponent } from '../../../../components/add-to-cart-button/add-to-cart-button.component';

declare var Plotly: any;

@Component({
  selector: 'app-module-table',
  imports: [
    CommonModule,
    MatPaginator,
    MatSort,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatGridListModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule,
    InfoComponent,
    MatTooltipModule,
    AddToCartButtonComponent
  ],
  templateUrl: './module-table.component.html',
  styleUrl: './module-table.component.scss',
})
export class ModuleTableComponent {
  private backend = inject(BackendService);
  private versionService = inject(VersionsService);
  private exploreService = inject(ExploreService);
  private cartService = inject(CartService);
  infoService = inject(InfoService);
  modalsService = inject(ModalsService);
  highestParamSet = this.exploreService.highestParamSet;
  protected readonly capitalize = capitalize;

  openEntityDialog(ensemblID: string, symbol?: string) {
    if (ensemblID.startsWith('ENSG')) {
      this.modalsService.openNodeDialog({
        ensg_number: ensemblID,
        gene_symbol: symbol
      } as Gene);
    } else {
      this.modalsService.openNodeDialog({
        enst_number: ensemblID,
        gene: { gene_symbol: symbol || ensemblID, ensg_number: '' }
      } as Transcript);
    }
  }

  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$
  predictionResource = this.predictService._prediction$;
  enrichmentScores$ = computed(() => this.prediction$()?.scores);

  refreshSignal$ = input();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  blueNodes = computed(() => this.predictService.topNModules$());
  redNodes = computed(() => this.predictService.topNModules$());
  includeModuleMembers = computed(() => this.predictService.includeModuleMembers$());
  // Synchronized with the shared "Score Scope" selector for the whole predict route.
  selectedDisease = this.predictService.selectedScope$;

  defaultMarkerSize = 8;
  MAX_ELEMENTS = undefined;

  columnNames: { [key: string]: string } = {
    symbol: 'Symbol',
    ensemblID: 'Ensembl ID',
    meanGiniDecrease: 'Mean Gini decrease',
    meanAccuracyDecrease: 'Mean accuracy decrease',
    memberOrCenter: 'Center or member',
    moduleCenter: 'Module center',
    moduleParams: 'Module parameters'
  };
  displayedColumns = Object.keys(this.columnNames);

  elementLimitWarning = signal(false);
  moduleMembersMap = new Map<string, ModuleMember[]>();
  spongEffectRuns = new Map<number, SpongEffectsRun>();

  gProfilerUrl$ = computed(() => {
    const modules = this.blueModules();
    if (!modules || modules.length === 0) {
      return '';
    } else {
      const genes = modules.map(module => module.symbol || module.ensemblID);
      return `https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query=${genes.join(' ')}`;
    }
  });

  // this is the top mscores from the user uploaded custom data: blue
  topEnrichScores = resource({
    request: () => ({
      prediction_scores: this.enrichmentScores$(),
      blueNodes: this.blueNodes(),
      selectedSamples: this.predictService.selectedSamples$()
    }),
    loader: async ({ request }) => {
      const { prediction_scores, blueNodes, selectedSamples } = request;
      if (!prediction_scores || !blueNodes) {
        return [];
      }
      const scores: number[][] = prediction_scores.values;
      const genes: string[] = prediction_scores.genes;
      const samples: string[] = prediction_scores.samples || [];
      const topScores: { gene: string, score: number }[] = [];

      // Map selected samples to indices
      const sampleIndices = selectedSamples.length > 0
        ? selectedSamples.map(s => samples.indexOf(s)).filter(idx => idx !== -1)
        : samples.map((_, idx) => idx);

      // mean over selected samples, then sort by mean score
      for (let i = 0; i < genes.length; i++) {
        const gene = genes[i];
        const geneScores = scores[i] || [];
        const selectedScores = sampleIndices.map(idx => geneScores[idx] ?? 0);
        const count = selectedScores.length;
        const meanScore = count > 0 ? selectedScores.reduce((a, b) => a + b, 0) / count : 0;
        topScores.push({ gene, score: meanScore });
      }
      topScores.sort((a, b) => b.score - a.score);
      return topScores.slice(0, blueNodes);
    }
  });

  // the grey modules: this is similar to the explore tab, but we show all modules from the TCGA data in grey. BUT ONLY FROM THE ACTUALLY USED MODEL, WHICH IS THE BEST MODEL
  lolipopPlotData = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.selectedDisease(),
      level: this.exploreService.level$(),
    }),
    loader: ({ request }) => {
      const { version, cancer, level } = request;
      if (!version || !cancer || !level) {
        return Promise.resolve([]);
      }
      const greyModules = this.getLollipopData(version, cancer, level, [this.highestParamSet()]);
      return greyModules;
    },
  });

  blueModules = signal<SpongEffectsModule[]>([]);
  userModuleMap = new Map<string, SpongEffectsModule>();

  // the blue modules (custom data): this is the modules that correspond to the top enrichment scores from the user uploaded custom data
  tableDataResource = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      level: this.predictService.level(),
      prediction: this.topEnrichScores.value(),
      includeMembers: this.includeModuleMembers(),
      blueNodes: this.blueNodes(),
      disease: this.selectedDisease(),
    }),
    loader: async ({ request }) => {
      const { version, level, prediction, includeMembers, disease } = request;
      if (!version || !level || !prediction || prediction.length === 0 || !disease) {
        return new MatTableDataSource<SpongEffectsModule | ModuleMember>([]);
      }
      const modules: SpongEffectsModule[] = await this.getModulesOfGene(
        version,
        disease,
        level,
        prediction.map(p => p.gene),
        [this.highestParamSet()]
      );
      if (modules.length === 0) {
        return new MatTableDataSource<SpongEffectsModule | ModuleMember>([]);
      }
      this.blueModules.set(modules);
      modules.forEach(module => {
        this.userModuleMap.set(this.getModuleKey(module), module);
      });
      return this.getTableData(modules, includeMembers ?? undefined);
    }
  });

  constructor() {
    this.initializeSpongEffectRuns();
    this.setupEffects();

    this.topEnrichScores.reload();
    this.tableDataResource.reload();
  }

  private setupEffects(): void {
    effect(() => {
      const table = this.tableDataResource.value();
      if (table && this.paginator && this.sort) {
        table.paginator = this.paginator;
        table.sort = this.sort;
      }
    });
  }

  private async initializeSpongEffectRuns(): Promise<void> {
    const version = this.versionService.versionReadOnly()();
    if (version) {
      const runs = await this.backend.getSpongEffectsRuns(version);
      runs.forEach(run => {
        this.spongEffectRuns.set(run.spongEffects_run_ID, run);
      });
    }
  }

  private getModuleKey(module: SpongEffectsModule): string {
    return `${module.ensemblID}_${module.spongEffects_run_ID}`;
  }

  private async getModulesOfGene(version: number, cancer: string, level: string, ens_list: string[], selectedParamSets: { [key: string]: any }): Promise<SpongEffectsModule[]> {
    let data: SpongEffectsModule[] = [];
    if (level === 'gene') {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        await Promise.all(
          ens_list.map(async (ens_number) => {
            let tmp = await this.backend.getSpongEffectsGeneModules(version, cancer, paramSet, this.blueNodes()!, ens_number);
            tmp.forEach((entry) => {
              data.push({
                ensemblID: entry.gene.ensg_number,
                symbol: entry.gene.gene_symbol,
                meanGiniDecrease: entry.mean_gini_decrease,
                meanAccuracyDecrease: entry.mean_accuracy_decrease,
                spongEffects_run_ID: entry.spongEffects_run_ID,
                spongEffects_module_ID: entry.spongEffects_gene_module_ID
              });
            });
          })
        );
      }
    }
    else {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        await Promise.all(
          ens_list.map(async (ens_number) => {
            let tmp = await this.backend.getSpongEffectsTranscriptModules(version, cancer, paramSet, this.blueNodes()!, ens_number);
            tmp.forEach((entry) => {
              data.push({
                ensemblID: entry.transcript.enst_number,
                symbol: entry.transcript.gene.gene_symbol,
                meanGiniDecrease: entry.mean_gini_decrease,
                meanAccuracyDecrease: entry.mean_accuracy_decrease,
                spongEffects_run_ID: entry.spongEffects_run_ID,
                spongEffects_module_ID: entry.spongEffects_transcript_module_ID
              });
            });
          })
        );
      }
    }
    return data;
  }

  private async getLollipopData(version: number, cancer: string, level: string, selectedParamSets: { [key: string]: any }): Promise<SpongEffectsModule[]> {
    const data: SpongEffectsModule[] = [];
    if (level === 'gene') {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        let tmp = await this.backend.getSpongEffectsGeneModules(version, cancer, paramSet, undefined)
        tmp.map((entry) => {
          data.push({
            ensemblID: entry.gene.ensg_number,
            symbol: entry.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_gene_module_ID,
          })
        }
        );
      };
    } else {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        let tmp = await this.backend.getSpongEffectsTranscriptModules(version, cancer, paramSet, undefined)
        tmp.map(entry => {
          data.push({
            ensemblID: entry.transcript.enst_number,
            symbol: entry.transcript.gene.gene_symbol,
            meanGiniDecrease: entry.mean_gini_decrease,
            meanAccuracyDecrease: entry.mean_accuracy_decrease,
            spongEffects_run_ID: entry.spongEffects_run_ID,
            spongEffects_module_ID: entry.spongEffects_transcript_module_ID
          });
        });
      };
    }
    return data;
  }

  private async fetchModuleMembers(module: SpongEffectsModule): Promise<void> {
    const version = this.versionService.versionReadOnly()();
    const disease = this.exploreService.selectedDisease$();
    const level = this.exploreService.level$();

    if (!version || !disease || !level) return;

    let members: ModuleMember[] = [];
    const key = this.getModuleKey(module);

    if (level === 'gene') {
      const response = await this.backend.getSpongEffectsGeneModuleMembers(
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
      );

      members = response.map(r => ({
        ensemblID: r.gene.ensg_number,
        symbol: r.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID
      }));
    } else {
      const response = await this.backend.getSpongEffectsTranscriptModuleMembers(
        version, disease, module.ensemblID, undefined, this.MAX_ELEMENTS
      );

      members = response.map(r => ({
        ensemblID: r.transcript.enst_number,
        symbol: r.transcript.gene.gene_symbol,
        meanGiniDecrease: 0,
        meanAccuracyDecrease: 0,
        centerOrMember: 'module member',
        moduleCenter: module.symbol,
        spongEffects_run_ID: module.spongEffects_run_ID
      }));
    }

    this.moduleMembersMap.set(key, members);
  }

  private async mapSampleToDisease(sample_ID: string, mapping: { [key: string]: string }): Promise<string> {
    // a sample ID has the form TCGA-K1-A6RT-01___pancancer. Extract the TSS code which is in this case K1
    const tssCode = sample_ID.split('-')[1];
    // use the mapping to get the disease name
    const diseaseName = mapping[tssCode];
    if (diseaseName) {
      return diseaseName;
    } else {
      return 'Unknown';
    }
  }

  private async getTableData(
    modules: SpongEffectsModule[],
    includeMembers: boolean | undefined
  ): Promise<MatTableDataSource<SpongEffectsModule | ModuleMember>> {
    let tableEntries: (SpongEffectsModule | ModuleMember)[] = modules.map(module => ({
      ...module,
      memberOrCenter: 'module center',
      moduleCenter: '-',
      moduleCenterID: module.ensemblID,
      moduleParams: this.spongEffectsRunParamsString(module.spongEffects_run_ID)
    }));

    if (includeMembers && modules.length > 0) {
      const fetchPromises = modules.map(async module => {
        const key = this.getModuleKey(module);
        if (!this.moduleMembersMap.has(key)) {
          await this.fetchModuleMembers(module);
        }
      });

      await Promise.all(fetchPromises);

      const allMembers: (SpongEffectsModule | ModuleMember)[] = [];
      for (const module of modules) {
        const key = this.getModuleKey(module);
        const members = this.moduleMembersMap.get(key) || [];

        allMembers.push(...members.map(m => ({
          ...m,
          moduleCenterID: module.ensemblID,
          memberOrCenter: 'module member' as const,
          moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID)
        })));
      }
      tableEntries = [...tableEntries, ...allMembers];
    }
    return new MatTableDataSource(tableEntries);
  }



  spongEffectsRunParamsString(spongEffectsRunID: number): string {
    const run = this.spongEffectRuns.get(spongEffectsRunID);
    if (!run) {
      return 'No parameters available';
    }

    return `mscor threshold: ${run.m_scor_threshold}
pAdjust threshold: ${run.p_adj_threshold}
modules cutoff: ${run.modules_cutoff}`;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.tableDataResource.value()) {
      this.tableDataResource.value()!.filter = filterValue.trim().toLowerCase();
      if (this.tableDataResource.value()!.paginator) {
        this.tableDataResource.value()!.paginator!.firstPage();
      }
    }
  }

  onPlotRendered() {
  }

  downloadCSV() {
    const data = this.tableDataResource.value()?.data || [];
    exportToCSV(data, 'predict_module_table');
  }
}
