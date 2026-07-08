import { Component, computed, effect, ElementRef, inject, input, resource, signal, viewChild, ViewChild } from '@angular/core';
import { BackendService } from '../../../../services/backend.service';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import { HeatmapDataSource } from '../../../../components/heatmap-plot/heatmap-plot.component';
import { ModuleMember, SpongEffectsRun, SpongEffectsModule } from '../../../../interfaces';
import { InfoService } from '../../../../services/info.service';
import { VersionsService } from '../../../../services/versions.service';
import { ExploreService } from '../../explore/service/explore.service';
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
import { capitalize } from "lodash";

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
  ],
  templateUrl: './module-table.component.html',
  styleUrl: './module-table.component.scss',
})
export class ModuleTableComponent {
  private backend = inject(BackendService);
  private versionService = inject(VersionsService);
  private exploreService = inject(ExploreService);
  infoService = inject(InfoService);
  highestParamSet = this.exploreService.highestParamSet;
  protected readonly capitalize = capitalize;

  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$
  predictionResource = this.predictService._prediction$;
  enrichmentScores$ = computed(() => this.prediction$()?.scores);
  predictSubtypes$ = this.predictService._subtypes$;

  refreshSignal$ = input();

  lollipopPlot = viewChild.required<ElementRef>('lollipopPlot');
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  formGroup = new FormGroup({
    redControl: new FormControl<number>(15, [Validators.min(3), Validators.max(100)]),
    blueControl: new FormControl<number>(15, [Validators.min(1), Validators.max(20)]),
    includeModuleMembers: new FormControl<boolean>(false),
    selectedDisease: new FormControl<string>(this.predictSubtypes$() ? (this.predictService.allPredictedTypes$()?.[0] ?? '') : 'Pancancer'),
  });
  blueNodes = signal(this.formGroup.get('blueControl')?.value);
  redNodes = signal(this.formGroup.get('redControl')?.value);
  includeModuleMembers = signal(this.formGroup.get('includeModuleMembers')?.value);
  selectedDisease = signal(this.formGroup.get('selectedDisease')?.value);

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
      blueNodes: this.blueNodes()
    }),
    loader: async ({ request }) => {
      const prediction_scores = request.prediction_scores;
      const blueNodes = request.blueNodes;
      if (!prediction_scores || !blueNodes) {
        return [];
      }
      const scores: number[][] = prediction_scores.values;
      const genes: string[] = prediction_scores.genes;
      const topScores: { gene: string, score: number }[] = [];
      // mean over samples, then sort by mean score
      for (let i = 0; i < genes.length; i++) {
        const gene = genes[i];
        const geneScores = scores[i];
        const meanScore = geneScores.reduce((a, b) => a + b, 0) / geneScores.length;
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

    this.formGroup.get('blueControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.blueNodes.set(value);
    });
    this.formGroup.get('redControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.redNodes.set(value);
    });
    this.formGroup.get('includeModuleMembers')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.includeModuleMembers.set(value);
    });
  }

  private setupEffects(): void {
    // effect(() => {
    //   this.refreshSignal$();
    //   this.refreshPlotSizes();
    // });

    // effect(() => {
    //   this.exploreService.selectedDisease$();
    //   this.exploreService.level$();
    //   this.clearAll();
    // });

    effect(() => {
      const redNodes = this.redNodes();
      const greyModules = this.lolipopPlotData.value();
      if (greyModules && greyModules.length > 0 && redNodes) {
        this.renderLollipopPlot(greyModules, redNodes);
      }
    });

    effect(() => {
      const table = this.tableDataResource.value();
      if (table && this.paginator && this.sort) {
        table.paginator = this.paginator;
        table.sort = this.sort;
      }
    });

    // effect(() => {
    //   if ((this.selectedModules.value()?.length ?? 0) === 0 && this.lolipopPlotData && (this.lolipopPlotData.value()?.length ?? 0) > 0) {
    //     this.selectedModules.reload();
    //   }
    // });
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
        for (const ens_number of ens_list) {
          let tmp = await this.backend.getSpongEffectsGeneModules(version, cancer, paramSet, this.blueNodes()!, ens_number);
          tmp.map((entry) => {
            data.push({
              ensemblID: entry.gene.ensg_number,
              symbol: entry.gene.gene_symbol,
              meanGiniDecrease: entry.mean_gini_decrease,
              meanAccuracyDecrease: entry.mean_accuracy_decrease,
              spongEffects_run_ID: entry.spongEffects_run_ID,
              spongEffects_module_ID: entry.spongEffects_gene_module_ID
            });
          });
        }
      }
    }
    else {
      for (const [key, paramSet] of Object.entries(selectedParamSets)) {
        for (const ens_number of ens_list) {
          let tmp = await this.backend.getSpongEffectsTranscriptModules(version, cancer, paramSet, this.blueNodes()!, ens_number);
          tmp.map((entry) => {
            data.push({
              ensemblID: entry.transcript.enst_number,
              symbol: entry.transcript.gene.gene_symbol,
              meanGiniDecrease: entry.mean_gini_decrease,
              meanAccuracyDecrease: entry.mean_accuracy_decrease,
              spongEffects_run_ID: entry.spongEffects_run_ID,
              spongEffects_module_ID: entry.spongEffects_transcript_module_ID
            });
          });
        }
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

  private renderLollipopPlot(greyModules: SpongEffectsModule[], redNodes: number): void {
    const data = [{
      x: greyModules.map(g => g.meanGiniDecrease),
      y: greyModules.map(g => g.meanAccuracyDecrease),
      mode: 'markers',
      type: 'scatter',
      name: 'Modules',
      text: greyModules.map(g => g.symbol),
      marker: {
        // size: this.defaultMarkerSize,
        // all default size except of red and blue nodes
        // size: greyModules.map((entry, i) => i < redNodes ? 10 : this.enrichmentScores$().genes.includes(entry.ensemblID) ? 10 : 6),
        size: this.defaultMarkerSize,
        // additinally color nodes blue if they are in entry.ensemblID in this.enrichmentScores$().genes
        // color: greyModules.map((entry, i) => i < redNodes ? 'red' : this.enrichmentScores$().genes.includes(entry.ensemblID) ? 'blue' : 'grey'),
        color: 'grey',
        opacity: 0.5

      }
    },
    // plot the red and blue nodes seperately
    {
      x: greyModules.slice(0, redNodes).map(g => g.meanGiniDecrease),
      y: greyModules.slice(0, redNodes).map(g => g.meanAccuracyDecrease),
      mode: 'markers',
      type: 'scatter',
      name: 'TCGA modules',
      text: greyModules.slice(0, redNodes).map(g => g.symbol),
      marker: {
        size: this.defaultMarkerSize,
        color: 'red',
        opacity: 1
      }
    },
    {
      x: greyModules.filter(g => (this.topEnrichScores.value() ?? []).map(e => e.gene).includes(g.ensemblID)).map(g => g.meanGiniDecrease),
      y: greyModules.filter(g => (this.topEnrichScores.value() ?? []).map(e => e.gene).includes(g.ensemblID)).map(g => g.meanAccuracyDecrease),
      mode: 'markers',
      type: 'scatter',
      name: 'Custom data',
      text: greyModules.filter(g => (this.topEnrichScores.value() ?? []).map(e => e.gene).includes(g.ensemblID)).map(g => g.ensemblID),
      marker: {
        size: this.defaultMarkerSize,
        color: 'blue',
        symbol: 'circle-open',
      },
    }
    ];

    const layout = {
      title: 'Module importance',
      showlegend: false,
      autosize: true,
      hovermode: 'closest',
      xaxis: {
        title: 'Mean decrease in Gini-index'
      },
      yaxis: {
        title: 'Mean decrease in accuracy'
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };

    const config = {
      responsive: true
    };
    Plotly.newPlot(this.lollipopPlot().nativeElement, data, layout, config);
  }

  refreshPlotSizes(): void {
    const lollipopElement = this.lollipopPlot().nativeElement;

    if (lollipopElement.checkVisibility()) {
      Plotly.Plots.resize(lollipopElement);
    }
  }

  clearAll(): void {
    Plotly.purge(this.lollipopPlot().nativeElement);
    this.moduleMembersMap = new Map<string, ModuleMember[]>();
    this.elementLimitWarning.set(false);
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
    console.log('Heatmap plot rendered successfully');
  }

}
