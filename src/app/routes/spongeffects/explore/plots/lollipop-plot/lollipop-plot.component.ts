import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  resource,
  signal,
  viewChild,
  ViewChild
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  Dataset,
  PlotlyData,
  SpongEffectsModule,
  SpongEffectsRun,
  ModuleMember
} from '../../../../../interfaces';
import { BackendService } from '../../../../../services/backend.service';
import { VersionsService } from '../../../../../services/versions.service';
import { ExploreService } from '../../service/explore.service';
import { InfoComponent } from '../../../../../components/info/info.component';
import { InfoService } from '../../../../../services/info.service';
import { debounceTime } from 'rxjs';

declare var Plotly: any;

@Component({
  selector: 'app-lollipop-plot',
  imports: [
    MatExpansionModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    MatGridListModule,
    MatTableModule,
    CommonModule,
    MatInputModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatSortModule,
    InfoComponent,
    MatButtonModule
  ],
  templateUrl: './lollipop-plot.component.html',
  styleUrls: ['./lollipop-plot.component.scss'],
})
export class LollipopPlotComponent {
  private backend = inject(BackendService);
  private versionService = inject(VersionsService);
  private exploreService = inject(ExploreService);
  infoService = inject(InfoService);

  refreshSignal$ = input();

  lollipopPlot = viewChild.required<ElementRef>('lollipopPlot');
  moduleExpressionHeatmap = viewChild.required<ElementRef>('moduleExpressionHeatmap');
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  formGroup = new FormGroup({
    markControl: new FormControl<number>(5, [Validators.min(3), Validators.max(100)]),
    topControl: new FormControl<number>(15, [Validators.min(1), Validators.max(20)]),
    includeModuleMembers: new FormControl<boolean>(false)
  });
  topN = signal(this.formGroup.get('topControl')?.value);
  redNodes = signal(this.formGroup.get('markControl')?.value);
  includeModuleMembers = signal(this.formGroup.get('includeModuleMembers')?.value);

  defaultMarkerSize = 12;
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
    const modules = this.selectedModules.value()
    if (!modules || modules.length === 0) {
      return '';
    } else {
      const genes = modules.map(module => module.symbol || module.ensemblID);
      return `https://biit.cs.ut.ee/gprofiler/gost?organism=hsapiens&query=${genes.join(' ')}`;
    }
  });

  // the grey modules
  lolipopPlotData = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      cancer: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      topN: this.topN() ?? 15,
    }),
    loader: ({ request }) => {
      console.log('Loading lollipop plot data');
      const { version, cancer, level, topN } = request;
      if (!version || !cancer || !level) {
        return Promise.resolve([]); 
      }
      const greyModules = this.getLollipopData(version, cancer, level, topN); 
      return greyModules;
    },
  });

  // the red modules
  selectedModules = resource({
    request: () => ({
      redNodes: this.redNodes() ?? 5,
    }),
    loader: async ({ request }) => {
      const { redNodes } = request;
      const modules = this.lolipopPlotData.value();
      console.log('Loading selected modules');
      if (!modules || modules.length === 0) {
        return [];
      }
      return modules.slice(0, redNodes);
    }
  });

  // expression values
  moduleExpressionData = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      disease: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      modules: this.selectedModules.value(),
      includeMembers: this.includeModuleMembers()
    }),
    loader: async ({ request }) => {
      console.log('Loading module expression data');
      const { version, disease, level, modules, includeMembers } = request;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return { data: [], layout: {}, config: {} };
      }
      return this.getModuleExpressionData(version, disease, level, modules, includeMembers ?? undefined);
    }
  });
  
  // table data
  tableDataResource = resource({
    request: () => ({
      version: this.versionService.versionReadOnly()(),
      disease: this.exploreService.selectedDisease$(),
      level: this.exploreService.level$(),
      modules: this.selectedModules.value(),
      includeMembers: this.includeModuleMembers()
    }),
    loader: async ({ request }) => {
      const { version, disease, level, modules, includeMembers } = request;
      if (!version || !disease || !level || !modules || modules.length === 0) {
        return new MatTableDataSource<SpongEffectsModule | ModuleMember>([]);
      }
      return this.getTableData(modules, includeMembers ?? undefined);
    }
  });

  constructor() {
    this.initializeSpongEffectRuns();
    this.setupEffects();

    this.formGroup.get('topControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.topN.set(value);
    });
    this.formGroup.get('markControl')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.redNodes.set(value);
    });
    this.formGroup.get('includeModuleMembers')?.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.includeModuleMembers.set(value);
    });
  }

  private setupEffects(): void {
    effect(() => {
      this.refreshSignal$();
      this.refreshPlotSizes();
    });
    
    effect(() => {
      this.exploreService.selectedDisease$();
      this.exploreService.level$();
      this.clearAll();
    });
    
    effect(() => {
      const expressionData = this.moduleExpressionData.value();
      if (this.moduleExpressionData.isLoading()) {
        Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
      } else {
        if (expressionData && expressionData.data && expressionData.data.length > 0) {
          this.renderHeatmap(expressionData);
        }
      }
    });

    effect(() => {
      const redNodes = this.redNodes();
      const greyModules = this.lolipopPlotData.value();
      if (greyModules && greyModules.length > 0 && redNodes) {
        this.renderLollipopPlot(greyModules, redNodes);
      }
    }
    );
    
    effect(() => {
      const table = this.tableDataResource.value();
      if (table && this.paginator && this.sort) {
        table.paginator = this.paginator;
        table.sort = this.sort;
      }
    });

    effect(() => {
      const redNodes = this.redNodes();
      if (this.lolipopPlotData.isLoading()) {
        Plotly.purge(this.lollipopPlot().nativeElement);
      } else {
        const plotData = this.lolipopPlotData.value();
        if (plotData && plotData.length > 0 && redNodes) {
          this.renderLollipopPlot(plotData, redNodes);
        }
      }
    });

    effect(() => {
      if ((this.selectedModules.value()?.length ?? 0) === 0 && this.lolipopPlotData && (this.lolipopPlotData.value()?.length ?? 0) > 0) {
        this.selectedModules.reload();
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

  private getLollipopData(version: number, cancer: string, level: string, topN: number): Promise<SpongEffectsModule[]> {
    if (level === 'gene') {
      return this.backend.getSpongEffectsGeneModules(version, cancer, topN).then(query => {
        const data = query.map(entry => ({
          ensemblID: entry.gene.ensg_number,
          symbol: entry.gene.gene_symbol,
          meanGiniDecrease: entry.mean_gini_decrease,
          meanAccuracyDecrease: entry.mean_accuracy_decrease,
          spongEffects_run_ID: entry.spongEffects_run_ID
        }));
        const limitedData = data.slice(0, Math.min(topN, data.length));
        return limitedData;
      });
    } else {
      return this.backend.getSpongEffectsTranscriptModules(version, cancer, topN).then(query => {
        const data = query.map(entry => ({
          ensemblID: entry.transcript.enst_number,
          symbol: entry.transcript.gene.gene_symbol,
          meanGiniDecrease: entry.mean_gini_decrease,
          meanAccuracyDecrease: entry.mean_accuracy_decrease,
          spongEffects_run_ID: entry.spongEffects_run_ID
        }));
        const limitedData = data.slice(0, Math.min(topN, data.length));
        return limitedData;
      });
    }
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
        version, disease, module.ensemblID, this.MAX_ELEMENTS
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

  private async getModuleExpressionData(
    version: number,
    disease_name: any,
    level:  'gene' | 'transcript',
    modules: SpongEffectsModule[],
    includeMembers: boolean | undefined
  ): Promise<PlotlyData> {
    let elements = modules.map(m => m.ensemblID);
    if (includeMembers) {
      for (const module of modules) {
        const key = this.getModuleKey(module);
        if (!this.moduleMembersMap.has(key)) {
          await this.fetchModuleMembers(module);
        }
        const members = this.moduleMembersMap.get(key) || [];
        elements.push(...members.map(m => m.ensemblID));
      }
      elements = [...new Set(elements)];
    }
    
    // Limit the number of elements to the maximum allowed
    this.elementLimitWarning.set(false);
    if (this.MAX_ELEMENTS && elements.length > this.MAX_ELEMENTS) {
      elements = elements.slice(0, this.MAX_ELEMENTS);
      console.log('Warning: too many elements, limiting to', this.MAX_ELEMENTS);
      this.elementLimitWarning.set(true);
    }
    
    // const expressionData = await this.backend.getExpression(
    //   version, elements, disease, level, this.MAX_ELEMENTS, undefined, true
    // );
    // get expression for 100 elements per request in parallel 
    const CHUNK_SIZE = 100000;
    const N_PARALLEL_REQUESTS = 10;
    const expressionPromises = [];
    console.log('Requesting expression data for', elements.length, 'elements');
    let hasMoreData = true;
    let offset = 0;
    while (hasMoreData) {
      // Fetch multiple pages in parallel
      const pagePromises = Array.from({ length: N_PARALLEL_REQUESTS }, (_, i) => {
        const currentOffset = offset + i * CHUNK_SIZE;
        return this.backend.getExpression(version, elements, disease_name, undefined, level, CHUNK_SIZE, currentOffset, true);
      });
  
      const pageResults = await Promise.all(pagePromises);
  
      // Flatten and add results
      for (const page of pageResults) {
        if (page.length > 0) {
          expressionPromises.push(...page);
        }
        // If a page has fewer rows than CHUNK_SIZE, we've reached the end
        if (page.length < CHUNK_SIZE) {
          hasMoreData = false;
        }
      }
  
      offset += CHUNK_SIZE * N_PARALLEL_REQUESTS; // Move to the next batch of pages
    }
    const expressionData = expressionPromises.flat();
    
    return this.createHeatmapConfig(expressionData, level, includeMembers);
  }

  private async getTableData(
    modules: SpongEffectsModule[],
    includeMembers: boolean | undefined
  ): Promise<MatTableDataSource<SpongEffectsModule | ModuleMember>> {
    let tableEntries: (SpongEffectsModule | ModuleMember)[] = modules.map(module => ({
      ...module,
      memberOrCenter: 'module center',
      moduleCenter: '-',
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
      
      for (const module of modules) {
        const key = this.getModuleKey(module);
        const members = this.moduleMembersMap.get(key) || [];
        
        tableEntries = [
          ...tableEntries,
          ...members.map(m => ({
            ...m,
            memberOrCenter: 'module member',
            moduleParams: this.spongEffectsRunParamsString(m.spongEffects_run_ID)
          }))
        ];
      }
    }
    
    return new MatTableDataSource(tableEntries);
  }

  private subtype_text(e: any): string {
    let subtype = e.dataset.disease_subtype || 'Unspecific';
    if (subtype === 'None' || subtype === 'null') {
      subtype = 'Unspecific';
    }
    return `${subtype} (${e.sample_ID})`
  }

  private createHeatmapConfig(
    expressionData: any[], 
    level: string, 
    includeMembers: boolean | undefined
  ): PlotlyData {

      // Extract unique subtypes and map them to colors
    console.log(expressionData)
    const subtypes = [...new Set(expressionData.map(e => e.dataset.disease_subtype))];
    console.log('subtypes', subtypes);
    // const subtypeColors: { [key: string]: string } = {};
    // subtypes.forEach((subtype, index) => {
    //   subtypeColors[index] = `hsl(${(index * 360) / subtypes.length}, 70%, 50%)`; // Generate unique colors
    // });
    const subtypeColors: { [key: string]: string } = {0: 'hsl(0, 70%, 50%)', 1: 'hsl(90, 70%, 50%)', 2: 'hsl(180, 70%, 50%)', 3: 'hsl(270, 70%, 50%)'}


    console.log('subtypeColors', subtypeColors);
    console.log('z', expressionData.map(e => subtypes.indexOf(e.dataset.disease_subtype)));
    console.log('x', expressionData.map(e => e.sample_ID));
    console.log('y', ['Subtype']);
    console.log('funny', subtypes.map((subtype, index) => [index / (subtypes.length - 1), subtypeColors[subtype]]))



    // Create a color bar for subtypes
    const subtypeBar = {
      z: expressionData.map(e => subtypes.indexOf(e.dataset.disease_subtype)),
      x: expressionData.map(e => e.sample_ID),
      // y needs to be a list of the length of expressionData
      y: expressionData.map(e => 'Subtype'),
      type: 'bar',
      colorscale: subtypeColors,
      // colorscale: subtypes.map((subtype, index) => [
      //   index / (subtypes.length - 1), 
      //   subtypeColors[index.toString()]
      // ]),
      hoverinfo: 'text',
      // text should contain the subtype and the sample ID
      text: expressionData.map(e => this.subtype_text(e)),
      showscale: false,
      coloraxis: 'coloraxis2', // Use a separate color axis for the subtype bar
      xaxis: 'x',
      yaxis: 'y2',
    };
  
    // Main heatmap trace
    const heatmap = {
      z: expressionData.map(e => e.expr_value),
      x: expressionData.map(e => e.sample_ID),
      y: expressionData.map(e => 'gene' in e ? e.gene.gene_symbol : e.transcript.enst_number),
      type: 'heatmap',
      zmid: 0,
      hoverongaps: false,
      name: 'Expression',
      showscale: true,
      colorscale: 'RdBu',
      coloraxis: 'coloraxis1', // Use a separate color axis for the main heatmap
    };
  
    // Layout configuration with proper typing
    const layout = {
      autosize: true,
      grid: {
        rows: 2,
        columns: 1,
        subplots: [['xy2'], ['xy']],
        roworder: 'top to bottom',
        heights: [0.1, 0.9], // Make the subtype bar smaller
      },
      xaxis: {
        ticks: '',
        showticklabels: false,
        title: 'Sample',
        automargin: true,
      },
      yaxis: {
        title: `Module center ${level === 'gene' ? 'gene' : 'transcript'}${includeMembers ? ' and module members' : ''}`,
        automargin: true,
      },
      yaxis2: {
        title: 'Subtype',
        automargin: true,
        showticklabels: false,
      },
      // coloraxis2: {
      //   colorscale: subtypes.map((subtype, index) => [index / (subtypes.length - 1), subtypeColors[index]]),
      //   colorbar: {
      //     title: 'Subtype',
      //     titleside: 'right',
      //   },
      // },
      coloraxis1: {
        colorscale: 'RdBu', // Color scale for the main heatmap
        colorbar: {
          title: 'Expression',
          titleside: 'right',
        },
      },
      title: {
        text: 'Expression of selected modules',
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      // annotations: subtypes.map((subtype, i) => ({
      //   x: 1.02,
      //   y: 0.95 - (i * 0.05),
      //   xref: 'paper',
      //   yref: 'paper',
      //   text: subtype,
      //   showarrow: false,
      //   font: {
      //     size: 10,
      //   },
      //   bgcolor: subtypeColors[i % subtypeColors.length],
      //   bordercolor: 'black',
      //   borderwidth: 1,
      //   borderpad: 1,
      //   opacity: 0.8,
      // })),
    };
  
    const config = {
      responsive: true,
    };
  
    return { data: [subtypeBar, heatmap], layout, config };
  }

  private renderLollipopPlot(limitedData: SpongEffectsModule[], redNodes: number): void {

    const data = [{
      x: limitedData.map(g => g.meanGiniDecrease),
      y: limitedData.map(g => g.meanAccuracyDecrease),
      mode: 'markers',
      type: 'scatter',
      name: 'Modules',
      text: limitedData.map(g => g.symbol),
      marker: {
        size: this.defaultMarkerSize,
        color: limitedData.map((_, i) => i < redNodes ? 'red' : 'grey')
      }
    }];
    
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

  private renderHeatmap(config: PlotlyData): void {
    if (!config || !config.data || config.data.length === 0) {
      Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
      return;
    }
    
    Plotly.newPlot(
      this.moduleExpressionHeatmap().nativeElement,
      config.data,
      config.layout,
      config.config
    );
  }

  // addModules(modules: SpongEffectsModule[], clickedSymbol?: string): void {
  //   if (!clickedSymbol) {
  //     this.selectedModules.set(modules);
  //   } else {
  //     const currentModules = this.selectedModules();
  //     const hasSymbol = currentModules.some(m => m.symbol === clickedSymbol);
      
  //     if (hasSymbol) {
  //       this.selectedModules.set(currentModules.filter(m => m.symbol !== clickedSymbol));
  //     } else {
  //       const modulesToAdd = modules.filter(m => m.symbol === clickedSymbol);
  //       this.selectedModules.set([...currentModules, ...modulesToAdd]);
  //     }
  //   }
  // }

  refreshPlotSizes(): void {
    const lollipopElement = this.lollipopPlot().nativeElement;
    const heatmapElement = this.moduleExpressionHeatmap().nativeElement;
    
    if (lollipopElement.checkVisibility()) {
      Plotly.Plots.resize(lollipopElement);
    }
    
    if (heatmapElement.checkVisibility()) {
      Plotly.Plots.resize(heatmapElement);
    }
  }

  clearAll(): void {
    Plotly.purge(this.lollipopPlot().nativeElement);
    Plotly.purge(this.moduleExpressionHeatmap().nativeElement);
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
}