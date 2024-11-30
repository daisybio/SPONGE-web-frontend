import {AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {FormControl, FormsModule, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {max, min, sum} from 'simple-statistics';
import * as d3 from 'd3-color';
import {BackendService} from "../../services/backend.service";
// import {Helper} from '../../helper';
import {ProgressBarMode} from '@angular/material/progress-bar';
import {DataSource} from '@angular/cdk/collections';
import {Observable, ReplaySubject, timer} from 'rxjs';
import {MatOption, ThemePalette} from '@angular/material/core';
import {
  EnrichmentScoreDistributions,
  CeRNAExpression,
  TranscriptExpression,
  ExampleExpression,
  LinearRegression,
  Metric,
  PlotData,
  PlotlyData,
  RunPerformance,
  SelectElement,
  SpongEffectsGeneModuleMembers,
  SpongEffectsGeneModules,
  SpongEffectsTranscriptModuleMembers,
  SpongEffectsTranscriptModules,
  Tab,
  CancerInfo
} from '../../interfaces';
import {MatCard, MatCardContent, MatCardHeader} from "@angular/material/card";
import {MatFormField} from "@angular/material/form-field";
import {MatSelect} from "@angular/material/select";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {MatGridList, MatGridTile} from "@angular/material/grid-list";
import {MatTooltip} from "@angular/material/tooltip";
import {NgForOf} from "@angular/common";
import {MatCheckbox} from "@angular/material/checkbox";
import {MatIcon} from "@angular/material/icon";
import {MatSidenavContainer} from "@angular/material/sidenav";
import {MatAccordion} from "@angular/material/expansion";
import {MatExpansionPanel} from "@angular/material/expansion";
import {MatExpansionPanelDescription} from "@angular/material/expansion";
import {MatExpansionPanelTitle} from "@angular/material/expansion";
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatGridListModule } from '@angular/material/grid-list';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatTableModule } from '@angular/material/table';

declare var Plotly: any;

export class Cancer {
  value: string;
  viewValue: string;
  allSubTypes: string[];
  sampleSizes: number[];

  base: string = "https://portal.gdc.cancer.gov/projects/TGCA-";

  constructor(value: string, viewValue: string, allSubTypes: string[], sampleSizes: number[], ) {
    this.value = value;
    this.viewValue = viewValue;
    this.allSubTypes = allSubTypes;
    this.sampleSizes = sampleSizes;
  }

  addSubtype(subtype: string) {
    this.allSubTypes.push(subtype);
  }

  addSampleSize(sampleSize: number) {
    if (sampleSize != null) this.sampleSizes.push(sampleSize);
  }

  totalNumberOfSamples() {
    return sum(this.sampleSizes.filter(s => s >= 0));
  }

  toString() {
    return this.viewValue + " - (" + this.value + ")";
  }

  getUrl() {
    return this.base + this.value
  }
}


export const spongEffectsCancerAbbreviations: string[] = ['PANCAN', 'BRCA', 'CESC', 'ESCA', 'HNSC', 'LGG', 'SARC', 'STAD', 'TGCT', 'UCEC']



export class ModuleDataSource extends DataSource<SpongEffectsGeneModules> {
  private _dataStream = new ReplaySubject<SpongEffectsGeneModules[]>();

  constructor(initialData: SpongEffectsGeneModules[]) {
    super();
    this.setData(initialData);
  }sss

  connect(): Observable<SpongEffectsGeneModules[]> {
    return this._dataStream;
  }

  disconnect() {}

  setData(data: SpongEffectsGeneModules[]) {
    this._dataStream.next(data);
  }
}



const EXAMPLE_GENE_EXPR: ExampleExpression[] = [
  {id: "ENSG00000000233", sample1: 6, sample2: 5, sample3: 8, sample4: 2, sampleN: 1},
  {id: "ENSG00000000412", sample1: 2, sample2: 1, sample3: 2, sample4: 3, sampleN: 4},
  {id: "ENSG00000000442", sample1: 10, sample2: 9, sample3: 8, sample4: 0, sampleN: 7}
]




@Component({
  selector: 'app-spongeffects',
  templateUrl: './spongeffects.component.html',
  // imports: [
  //   MatCardHeader,
  //   MatCard,
  //   MatFormField,
  //   MatSelect,
  //   MatOption,
  //   MatButtonToggleGroup,
  //   MatButtonToggle,
  //   MatCardContent,
  //   MatGridList,
  //   MatGridTile,
  //   MatTooltip,
  //   FormsModule,
  //   NgForOf,
  //   MatExpansionPanel,
  //   MatExpansionPanelTitle,
  //   MatExpansionPanelDescription,
  //   MatCheckbox,
  //   MatIcon,
  //   MatSidenavContainer,
  //   MatAccordion,
  //   MatExpansionPanel,
  //   MatExpansionPanelDescription,
  //   MatExpansionPanelTitle,
  //   MatButtonModule,
  //   MatCheckboxModule,
  //   MatExpansionModule,
  //   MatFormFieldModule,
  //   MatInputModule,
  //   MatProgressBarModule,
  //   MatSelectModule,
  //   MatSidenavModule,
  //   MatTooltipModule,
  //   MatButtonToggleModule,
  //   MatGridListModule,
  //   NgxDropzoneModule,
  //   MatTableModule,
  // ],
  styleUrls: ['./spongeffects.component.scss']
})

export class SpongEffectsComponent implements OnInit, AfterViewInit {
  // API
  constructor(private backend: BackendService, private renderer: Renderer2) {
    // this.diseases = this.backend.getDatasets();
    // this.overallCounts = this.backend.getOverallCounts();
    this.cancerInfoAvailable = this.initCancerInfo();
  }

  tabs: Tab[] = [
    {value: "explore", viewValue: "Explore", icon: "../../../assets/img/magnifying_glass.png"},
    {value: "predict", viewValue: "Predict", icon: "../../../assets/img/chip-intelligence-processor-svgrepo-com.png"}
  ]
  selectedTab: Tab = this.tabs[0];
  source: string = "TCGA";
  cancers: Cancer[] = [];
  selectedCancer: Cancer | undefined = undefined;
  levels: string[] = ["Gene", "Transcript"];
  level: string = this.levels[0];
  exploreResultsQueried: boolean = false;

  performanceMeasures: SelectElement[] = [
    {value: 'balanced_accuracy', viewValue: "Balanced Accuracy"},
    {value: 'detection_prevalence', viewValue: "Detection Prevalence"},
    {value: 'detection_rate', viewValue: "Detection Rate"},
    {value: 'f1', viewValue: "F1"},
    {value: 'neg_pred_value', viewValue: "Negative Prediction Value"},
    {value: 'pos_pred_value', viewValue: "Positive Prediction Value"},
    {value: 'precision_value', viewValue: "Precision"},
    {value: 'prevalence', viewValue: "Prevalence"},
    {value: 'recall', viewValue: "Recall"},
    {value: 'sensitivity', viewValue: "Sensitivity"},
    {value: 'specificity', viewValue: "Specificity"}
  ];
  performanceMeasure: SelectElement = this.performanceMeasures[0];
  performanceSelectPanelIsOpen: boolean = false;
  includeModuleMembers: boolean = false;
  // loading toggles
  overallAccuracyLoading: boolean = true;
  classPerformanceLoading: boolean = true;
  enrichmentScoreDensityLoading: boolean = true;
  lollipopLoading: boolean = true;
  expressionsLoading: boolean = true;
  elementExpressionLoading: boolean = true;

  // plot divs
  @ViewChild("sampleDistributionPie") sampleDistributionPieDiv!: ElementRef;
  @ViewChild("overallAccuracyPlot") overallAccPlotDiv!: ElementRef;
  @ViewChild("classModelPerformancePlot") classPerformancePlotDiv!: ElementRef;
  @ViewChild("enrichmentScoresByClassPlot") enrichmentScoresByClassPlotDiv!: ElementRef;
  @ViewChild("lollipopPlot") lollipopPlotDiv!: ElementRef;
  @ViewChild("moduleExpressionHeatmapDiv") moduleExpressionHeatmap!: ElementRef;
  @ViewChild("moduleMiRnaExpressionDiv") moduleMiRnaExpressionPlot!: ElementRef;

  // lollipop plot
  modulesData!: Promise<SpongEffectsGeneModules[]>;
  filteredModulesData!: SpongEffectsGeneModules[];

  markControl: FormControl = new FormControl(3, [Validators.min(1.0), Validators.max(20)]);
  topControl: FormControl = new FormControl(200, [Validators.min(3.0), Validators.max(1000)]);

  selectedModules: SpongEffectsGeneModules[] = [];
  modulesTableColumns: string[] = [
    "ensemblID",
    "symbol",
    "meanGiniDecrease",
    "meanAccuracyDecrease",
    "description"
  ];
  dynamicModulesData: ModuleDataSource = new ModuleDataSource(this.selectedModules);

  selectedEnsemblId: SpongEffectsGeneModules | undefined = undefined;

  // plot parameters
  defaultPlotMode: string = "lines+markers";
  defaultLineWidth: number = 6;
  defaultMarkerSize: number = 12;

  /* predict variables */
  // plots
  @ViewChild("typePredictPie")
  typePredictPiePlot!: ElementRef;
  predictSubtypes: boolean = false;
  logScaling: boolean = true;

  progressBarMode: ProgressBarMode = "determinate";
  progressBarValue: number = 0;
  estimatedRunTime: number = 0;

  // loading values
  predictionQueried: boolean = false;
  predictionLoading: boolean = false;
  timerRunning: boolean = false;
  // file variables
  uploadedExpressionFiles: File[] = [];
  filesToAccept: string = "text/*,application/*";
  maxFileSize: number = 100000000;
  // prediction data
  predictionData: any;
  predictionMeta: any;
  predictedType: string = "None";
  predictedSubtype: string = "None";

  // default parameters
  mscorDefault: number = 0.1;
  fdrDefault: number = 0.05;
  minSizeDefault: number = 100;
  maxSizeDefault: number = 2000;
  minExprDefault: number = 10;
  methods: string[] = ["gsva", "ssgsea", "OE"];
  methodDefault: string = this.methods[0];
  showExpressionExample: boolean = false;

  mscorControl: FormControl = new FormControl(this.mscorDefault, [Validators.min(0.0), Validators.max(10.0)]);
  fdrControl: FormControl = new FormControl(this.fdrDefault, [Validators.min(0.0), Validators.max(0.5)]);
  minExprControl: FormControl = new FormControl(this.minExprDefault, [Validators.min(0.0), Validators.max(1000)]);
  minSizeControl: FormControl = new FormControl(this.minSizeDefault, [Validators.min(0.0), Validators.max(5000)]);
  maxSizeControl: FormControl = new FormControl(this.maxSizeDefault, [Validators.min(0.0), Validators.max(5000)]);
  // TODO: test runtime of other methods

  methodFunctions: Map<string, LinearRegression> = new Map<string, LinearRegression>(
    [
      [this.methods[0], {slope: 0.7, x0: 15}],
      [this.methods[1], {slope: 1, x0: 20}],
      [this.methods[2], {slope: 2, x0: 20}],
    ]
  );

  exampleExpressionData: MatTableDataSource<any> = new MatTableDataSource<any>(EXAMPLE_GENE_EXPR);
  displayedCols: string[] = ["id", "sample1", "sample2", "sample3", "sample4", "sampleN"];
  displayedColsValueMap: Map<string, string> = new Map<string, string>([
    ["id", ""],
    ["sample1", "sample1"], ["sample2", "sample2"], ["sample3", "sample3"], ["sample4", "sample4"], ["sampleN", "sampleN"],
  ]);

  cancerInfoAvailable: Promise<any> = new Promise(() => {});

  ngOnInit(): void {
  }

//   /**
//    * retrieve TCGA cancer data from API
//    */
  private async initCancerInfo() {
    let response = await this.backend.getDatasetsInformation(this.source);
    let cancerMap: Map<string, Cancer> = new Map<string, Cancer>();

    response.forEach((entry: {
      study_abbreviation: string, disease_name: string, disease_subtype: string,
      number_of_samples: number
    }) => {
      // fill cancer map
      let cancer = cancerMap.get(entry.study_abbreviation);
      if (cancer) {
        if (entry.disease_subtype != null) {
          cancer.addSubtype(entry.disease_subtype);
          cancer.addSampleSize(entry.number_of_samples);
        }
      } else {
        cancerMap.set(entry.study_abbreviation,
          new Cancer(entry.study_abbreviation, entry.disease_name,
            [entry.disease_subtype], [entry.number_of_samples]));
      }
    });
    // set PANCAN subtypes
    const panCanCancer = cancerMap.get('PANCAN');
    if (!panCanCancer) {
      console.error("PANCAN cancer not found in response");
    } else {
      panCanCancer.allSubTypes = [...cancerMap.keys()].filter(v => v != 'PANCAN');
      panCanCancer.sampleSizes = [...cancerMap.entries()]
        .filter((value) => value[0] != 'PANCAN')
        .map(c => c[1].totalNumberOfSamples())
    }
    // remove null subtypes
    cancerMap.forEach((value) => {
      value.allSubTypes = value.allSubTypes.filter(v => v != null);
    });
    // set class variable with spongEffects compatible cancer types
    this.cancers = [...cancerMap.values()].filter(c => spongEffectsCancerAbbreviations.includes(c.value));
    this.selectedCancer = this.cancers[0];
  }

  ngAfterViewInit() {
    if (this.selectedCancer != undefined) {
      this.cancerInfoAvailable.then(_ => this.cancerSelected(<Cancer>this.selectedCancer));
      }
  }

  setTab(tab: Tab) {
    this.selectedTab = tab;
    // reset explore tab
    if (tab.value == this.tabs[0].value && this.selectedCancer != undefined) {
      this.cancerSelected(this.selectedCancer).then(_ => this.exploreResultsQueried = true);
    }
  }

  setLevel(level: string) {
    this.level = level;
    if (this.selectedCancer != undefined) {
      this.cancerSelected(this.selectedCancer).then(_ => this.exploreResultsQueried = true);
    }
  }


  getGeneCardLink(gene: string): string {
    return `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene}`;
  }

  getLevelButtonStyle(level: string): string {
    if (level == this.level) {
      return "background-color: #1e719b; color: white";
    } else {
      return "background-color: white";
    }
  }
s
  getCancerImage() {
    if (this.selectedCancer == undefined) return "../../../assets/img/spongEffects_logo.png";
    return "../../../assets/img/TCGA/" + this.selectedCancer.value + ".png";
  }

  setPreviewCancer(cancer: Cancer) {
    this.selectedCancer = cancer;
    this.plotSampleDistribution(this.getSampleDistributionData());
  }

  clearResults() {
    // allow new queries
    this.exploreResultsQueried = false;
    // clear plot divs
    this.overallAccPlotDiv.nativeElement.innerHTML = "";
    this.enrichmentScoresByClassPlotDiv.nativeElement.innerHTML = "";
    this.lollipopPlotDiv.nativeElement.innerHTML = "";
  }

  async plotResults() {
    if (this.exploreResultsQueried) return null;
    // get accuracy data from API
    const acData: Promise<Metric[]> = this.getOverallAccuracyData();
    // show according plot
    this.plotOverallAccuracyPlot(acData).then(_ => this.overallAccuracyLoading = false);
    // plot class specific performance
    this.plotModelClassPerformance().then(_ => this.classPerformanceLoading = false);
    // get spongEffect scores from API
    const enrichmentScores: Promise<Map<string, PlotData>> = this.getEnrichmentClassDensities();
    // plot enrichment score class distributions
    this.plotEnrichmentScoresByClass(enrichmentScores).then(_ => this.enrichmentScoreDensityLoading = false);
    // get top centralities
    this.modulesData = this.getMeanGiniDecrease();
    // plot lollipop plot
    this.plotLollipop(this.topControl.value).then(_ => this.lollipopLoading = false);
  }

  async clearSelection() {
    this.selectedModules = [];
    this.resetLollipop();
    this.dynamicModulesData.setData(this.selectedModules);
  }

  async exploreExpression() {
    // plot module expression
    this.getModulesExpression()
      .then(config => this.plotModuleExpression(config))
      .then(_ => this.expressionsLoading = false);
  }

  async cancerSelected(cancer: Cancer) {
    this.clearResults();
    this.selectedCancer = cancer;
    this.selectedEnsemblId = undefined;
    // load sample distribution
    let sampleDistData: PlotlyData = this.getSampleDistributionData();
    // plot sample distribution pie
    this.plotSampleDistribution(sampleDistData);
    this.plotResults().then(_ => this.exploreResultsQueried = true);
  }

  async resetLollipop() {
    this.plotLollipop(this.topControl.value).then(_ => this.lollipopLoading = false);
  }

  getRandomID(l: number): string {
    let result: string = 'TCGA-';
    const characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charactersLength: number = characters.length;
    let counter: number = 0;
    while (counter < l) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  getRandomIDs(n: number, l: number): string[] {
    return Array.from(Array(n).keys()).map(i => this.getRandomID(l));
  }

  getRandomElements(n: number, type: string) {
    let base: string = "ENS";
    let l: number = 4;
    if (type == "gene") {
      base += "G";
    } else if (type == "transcript") {
      base += "T"
    } else if (type == "mirna") {
      base = "hsa_mir_"
    } else {
      throw new Error("type argument has to be either gene or transcript");
    }
    base+="000000"
    return Array.from(Array(n).keys()).map(i => base+this.getRandomValues(l, 0, 9, true).join(""));
  }

  getRandomValue(min: number = 0, max: number = 1, round: boolean = false): number {
    const randomValue: number = Math.random();
    return round ? Math.floor((max - (min)) * randomValue + (min)): (max - (min)) * randomValue + (min);
  }

  getRandomValues(n: number, min: number = 0, max: number = 1, round: boolean = false): number[] {
    return Array.from(Array(n).keys()).map(i => this.getRandomValue(min, max, round));
  }

  getSampleDistributionData(): PlotlyData {
    if (this.selectedCancer == undefined) {
      return {data: [], layout: {}, config: {}};
    }
    let data = [
      {
        values: this.selectedCancer.sampleSizes,
        labels: this.selectedCancer.allSubTypes,
        type: "pie",
        hoverinfo: 'label+value+percent',
        textinfo: 'none'
      }
    ];
    let layout = {
      autosize: true,
      showlegend: true,
      legend: {"orientation": "h"},
      margin: {
        b: 5,
        l: 5,
        r: 5,
        t: 50
      },
      title: {
        text: "Sample distribution of " + this.selectedCancer.value + " (" + this.selectedCancer.totalNumberOfSamples() + " samples)",
        font: {
          size: 14
        }
      }
    };
    let config = {
      responsive: true
    }
    return {data: data, layout: layout, config: config};
  }

  async getOverallAccuracyData(): Promise<Metric[]> {
    this.overallAccuracyLoading = true;
    if (this.selectedCancer == undefined) {
      return [];
    }
    const modelPerformances = await this.backend.getRunPerformance(this.selectedCancer.viewValue, this.level);
    return modelPerformances.map((entry: RunPerformance, idx: number): Metric => {
      return {
      name: entry.model_type,
      split: entry.split_type,
      lower: entry.accuracy_lower,
      upper: entry.accuracy_upper,
      level: idx
      }
    });
  }

  async cancelClick(event: any) {
    event.stopPropagation();
  }

  async rePlotModelClassPerformance(): Promise<any> {
    this.plotModelClassPerformance().then(_ => this.classPerformanceLoading = false);
  }

  async plotModelClassPerformance(): Promise<any> {
    this.classPerformanceLoading = true;
    if (this.selectedCancer == undefined) {
      return null;
    }
    // get data
    const performanceData = await this.backend.getRunClassPerformance(this.selectedCancer.viewValue, this.level);
    // transform data
    const data: PlotlyData = await this.getModelClassPerformancePlotData(performanceData);
    // plot data
    Plotly.newPlot(this.classPerformancePlotDiv.nativeElement, data.data, data.layout, data.config);
  }

  async togglePanel(event: MouseEvent, panel: MatExpansionPanel) {
    event.stopPropagation();
    if (this.performanceSelectPanelIsOpen) {
      panel.open()
      this.resetClassAccPlot();
    } else {
      panel.close()
    }
  }

  async getModelClassPerformancePlotData(performanceData: any[]): Promise<PlotlyData> {
    // group the data by model type
    const traceGroups: { [key: string]: any[] } = {};
    performanceData.forEach(entry => {
      const modelType = entry.spongEffects_run.model_type;
      if (!traceGroups[modelType]) {
        traceGroups[modelType] = [];
      }
      traceGroups[modelType].push(entry);
    });
    // build actual traces
    const traces = [];
    for (const modelType in traceGroups) {
      if (traceGroups.hasOwnProperty(modelType)) {
        const group = traceGroups[modelType];

        const trace = {
          x: group.map(entry => entry.prediction_class),
          y: group.map(entry => entry[this.performanceMeasure.value]),
          type: 'bar',
          name: modelType,
        };

        traces.push(trace);
      }
    }
    const meanTextLength: number = Math.round(sum(traces[0].x.map(d => d.length))/traces[0].x.length);
    const textPad: number = meanTextLength*10.5;
    const containerWidth = this.renderer.selectRootElement(this.classPerformancePlotDiv.nativeElement).offsetWidth;
    const angle: number = meanTextLength > 15 ? 90: 0;
    const layout = {
      barmode: 'group',
      autosize: true,
      width: containerWidth,
      xaxis: {
        autosize: true,
        tickangle: angle
      },
      yaxis: {
        title: this.performanceMeasure.viewValue
      },
      margin: {
        t: 25,
        b: textPad,
        l: 50,
        r: 0
      },
      legend: {
        orientation: "h",
        x: 0.5,
        y: 1.25
      }
    };
    const config = { responsive: true };
    return {data: traces, layout: layout, config: config};
  }

  async resetClassAccPlot() {
    Plotly.update(this.classPerformancePlotDiv.nativeElement);
  }

  private async getEnrichmentClassDensities(): Promise<Map<string, PlotData>> {
    this.enrichmentScoreDensityLoading = true;
    if (this.selectedCancer == undefined) {
      return new Map<string, PlotData>();
    }
    const queryResponse: EnrichmentScoreDistributions[] = await this.backend.getEnrichmentScoreDistributions(this.selectedCancer.viewValue, this.level);
    const classDensities: Map<string, PlotData> = new Map<string, PlotData>();
    queryResponse.forEach((entry: { prediction_class: string; enrichment_score: any; density: any; }) => {
      if (classDensities.has(entry.prediction_class) && classDensities.get(entry.prediction_class) != undefined) {
        const pred_class: PlotData = <PlotData>classDensities.get(entry.prediction_class);
        pred_class.x.push(entry.enrichment_score)
        pred_class.y.push(entry.density)
      } else {
        classDensities.set(entry.prediction_class, {
          x: [entry.enrichment_score], y: [entry.density]
        });
      }
    });
    return classDensities;
  }

  async getMeanGiniDecrease(): Promise<SpongEffectsGeneModules[]> {
    if (this.selectedCancer == undefined) {
      return [];
    }
    this.lollipopLoading = true;
    return await this.backend.getSpongEffectsGeneModules(this.selectedCancer.viewValue);
  }

  async getModuleMembers(): Promise<Map<string, string[]>> {
    if (this.selectedCancer == undefined || this.selectedModules.length == 0) {
      return new Map<string, string[]>();
    }
    const members: Map<string, string[]> = new Map<string, string[]>();
    if (this.level == 'gene') {
      const response: SpongEffectsGeneModuleMembers[] = await this.backend.getSpongEffectsGeneModuleMembers(
        this.selectedCancer.viewValue,
        <string>this.selectedModules.map(s => s.ensg_number)
      )
      const key: string = "hub_ensg_number";
      response.forEach((e: SpongEffectsGeneModuleMembers) => {
        if (!members.has(e[key])) members.set(e[key], []);
        const toPush: string[] = [e.member_ensg_number, e.member_gene_symbol]
        const memberList = members.get(e[key]);
        if (memberList) {
          memberList.push(...toPush);
        }
      });
    } else {
      // TODO
      // const response: SpongEffectsTranscriptModuleMembers[] = await this.backend.getSpongEffectsTranscriptModuleMembers(
      //   this.selectedCancer.viewValue,
      //   <string>this.selectedModules.map(s => s.enst_number)
      // )
    }
    return members;
  }

  async getModulesExpression(): Promise<PlotlyData> {
  // TODO
  //   this.expressionsLoading = true;
  //   let apiCall: any;
  //   let key: string;
  //   let elements: string[] = this.selectedModules.map(s => s.ensg_number);
  //   // include module members in heatmap
  //   if (this.includeModuleMembers) {
  //     const members: Map<string, string[]> = await this.getModuleMembers();
  //     const memberValues: string[] = [].concat([...members.values()]);
  //     elements.push(...memberValues);
  //   }
  //   if (this.level.toLowerCase() == "gene") {
  //     key = "ensg_number";
  //     apiCall = this.backend.getCeRNAExpression(this.selectedCancer.viewValue,
  //       undefined, elements, undefined, this.level);
  //   } else {
  //     key = "enst_number";
  //     apiCall = this.backend.getTranscriptExpression(this.selectedCancer.viewValue,
  //       elements, undefined, undefined, this.level);
  //   }
  //   // await apiCall
  //   const apiResponse = await apiCall;
  //   // split into (sub-)types
  //   const typeSplit: Map<string, any[]> = new Map<string, any[]>();
  //   apiResponse.forEach(entry => {
  //     const dataset: string = entry.dataset;
  //     if (!typeSplit.has(dataset) || typeSplit.get(dataset) == undefined) {
  //       typeSplit.set(dataset, []);
  //     }
  //     typeSplit.get(dataset).push(entry);
  //   });
  //
  //   // build traces for each dataset
  //   let data: any[] = [];
  //   typeSplit.forEach((entry: any[], dataset: string) => {
  //     // transform data of entries
  //     let xSamples: string[] = [];
  //     const xSet: Set<string> = new Set<string>();
  //     let nX: number = -1;
  //     let yElements: string[] = [];
  //     const ySet: Set<string> = new Set<string>();
  //     let nY: number = -1;
  //     let zValues: number[][] = [[]];
  //
  //     entry.forEach(e => {
  //       if (!xSet.has(e.sample_ID)) {
  //         xSamples.push(e.sample_ID);
  //         nX += 1;
  //       }
  //       if (!ySet.has(e.gene[key])) {
  //         yElements.push(e.gene.gene_symbol + " (" + e.gene[key] + ")");
  //         nY += 1;
  //       }
  //       zValues[nY][nX] = e.expr_value;
  //     });
  //     // add trace
  //     data.push({
  //       z: zValues,
  //       x: xSamples,
  //       y: yElements,
  //       type: "heatmap",
  //       hoverongaps: false,
  //       name: dataset,
  //       showscale: false
  //     });
  //   });
  //   // only show scale on last heatmap
  //   data[-1].showscale = true;
  //   // add x-axis subplot for each trace
  //   data.slice(1).forEach((d, i) => {
  //     let idx: string = (i+2).toString();
  //     d.xaxis = 'x' + idx
  //   });
  //   // set layout options
  //   const layout = {
  //     autosize: true,
  //     showlegend: true,
  //     legend: {orientation: "h"},
  //     xaxis: {
  //       showgrid: false,
  //       showticklabels: false,
  //       showticks: false
  //     },
  //     margin: {
  //       b: 125,
  //       l: 125,
  //       r: 50,
  //       t: 50
  //     },
  //     title: {
  //       text: "Module expression of selected modules",
  //       font: {
  //         size: 14
  //       }
  //     },
  //     grid: {
  //       rows: 1,
  //       columns: data.length
  //     },
  //     annotations: []
  //   };
  //   let config = {
  //     responsive: true
  //   }
  //   return {data: data, layout: layout, config: config};
  }

  getColors(n: number): string[] {
    const colors: string[] = [];
    const step: number = 360 / n;
    const saturation: number = 1;
    const lightness: number = 0.6
    for (let i = 0; i < n; i++) {
      const color = d3.hsl(i * step, saturation, lightness);
      colors.push(color.toString());
    }
    return colors;
  }

  /**
   * returns module member expression data for a given ensemblId
   */
  getModuleExpressionDataTest(ensemblId: string): PlotlyData {
    // TODO: get data from API and remove testing data

    if (this.selectedCancer == undefined) {
      return {data: [], layout: {}, config: {}};
    }

    let data: any[] = [];
    const y: number = this.getRandomValue(2, 10, true);
    let y_elements: string[] = this.getRandomElements(y, this.level.toLowerCase());
    const legendGroup: string = "commonGroup";
    let x0: number = 0;
    const gapWidth: number = 0.2;
    const traceWidth: number = 0.6;

    this.selectedCancer.allSubTypes.forEach((subtype, index) => {
      const x: number = this.getRandomValue(2, 10, true);
      let x_samples: string[] = this.getRandomIDs(x, 4);
      let z_values: number[][] = Array.from(Array(y).keys()).map(_ => this.getRandomValues(x, 0, 15));
      data.push(
        {
          x: x_samples,
          y: y_elements,
          z: z_values,
          name: subtype,
          type: "heatmap",
          hoverongaps: false,
          x0: x0,
          dx: traceWidth
        }
      );
      x0 += traceWidth + gapWidth;
    })

    const layout = {
      autosize: true,
      showlegend: true,
      xaxis: {
        showgrid: false,
        showticklabels: false,
        showticks: false
      },
      margin: {
        b: 125,
        l: 125,
        r: 50,
        t: 50
      },
      title: {
        text: "Module expression of hub-node " + this.selectedEnsemblId,
        font: {
          size: 14
        }
      },
      annotations: []
    };
    let config = {
      responsive: true
    }
    // add type groups to heatmap
    const traceColors: string[] = this.getColors(this.selectedCancer.allSubTypes.length);
    const yGap: number = 0.1;
    const boxHeight: number = 20;
    const widthPerSample: number = 2;

    data.forEach((trace, index) => {
      for (let idx = 0; idx < trace.x.length; idx++) {
        layout.annotations.push({
          x: trace.x[idx],
          y: trace.y.length + yGap,
          hovertext: trace.name,
          xref: 'x',
          yref: 'y',
          text: '',
          showarrow: false,
          align: 'center',
          bgcolor: traceColors[index],
          width: widthPerSample,
          height: boxHeight
        });
      }
    });
    return {data: data, layout: layout, config: config};
  }

  getModuleMiRnaExpressionDataTest(hubId: string): PlotlyData{
    if (this.selectedCancer == undefined) {
      return {data: [], layout: {}, config: {}};
    }
    let miRNAs: string[] = this.getRandomElements(this.getRandomValue(10, 20, true), "mirna");
    let data: any[] = [];
    this.selectedCancer.allSubTypes.forEach(subtype => {
      data.push({
        x: miRNAs,
        y: this.getRandomValues(miRNAs.length, 0, 12),
        name: subtype,
        type: "bar"
      });
    });
    let layout = {
      autosize: true,
      margin: {
        b: 5,
        l: 5,
        r: 5,
        t: 50
      },
      title: {
        text: "Module miRNA expression of " + this.selectedEnsemblId,
        font: {
          size: 14
        }
      },
      barmode: "group"
    };
    let config = {
      responsive: true
    };
    return {data: data, layout: layout, config: config}
  }

  plotSampleDistribution(config: PlotlyData) {
    Plotly.newPlot(this.sampleDistributionPieDiv.nativeElement, config.data, config.layout, config.config);
  }

  plotModuleExpression(config: PlotlyData) {
    Plotly.newPlot(this.moduleExpressionHeatmap.nativeElement, config.data, config.layout, config.config);
  }

  plotModuleMiRnaExpression(config: PlotlyData) {
    Plotly.newPlot(this.moduleMiRnaExpressionPlot.nativeElement, config.data, config.layout, config.config);
  }

  async plotOverallAccuracyPlot(metricData: Promise<Metric[]>) {
    // set main layout options
    let layout = {
      autosize: true,
      yaxis: {
        showline: false,
        showticklabels: false
      },
      margin: {
        t: 0,
        b: 40,
        l: 30,
        r: 20
      },
      annotations: [
        // x-axis label
        {
          xref: "paper",
          yref: "paper",
          x: 0.5,
          y: -0.1,
          xanchor: "center",
          yanchor: "top",
          text: "Overall model accuracy",
          showarrow: false
        }
      ],
      legend: {
        traceorder: "reversed"
      }
    };
    let metrics: Metric[] = await metricData;
    let data = metrics.map(metric => {
      const col: string = metric.name == "modules" ? "green": "orange"
      // data points
      return {
        x: [metric.lower, metric.upper],
        y: [metric.level, metric.level],
        mode: this.defaultPlotMode,
        name: metric.name + " ("  + metric.split + ")",
        text: ["Lower Bound (Accuracy)", "Upper Bound (Accuracy)"],
        hovertemplate: "<i>%{text}: %{x:.2f}</i>",
        line: {
          width: this.defaultLineWidth,
          color: col,
          dash: metric.split == "train" ? "solid": "dash"
        },
        marker: {
          size: this.defaultMarkerSize,
          symbol: ['circle', 'diamond'],
          color: col
        },
        showlegend: true
      }
    });
    const config = { responsive: true };
    // remove loading spinner and show plot
    Plotly.newPlot("overall-acc", data, layout, config);
  }

  async resetOverallAccPlot() {
    Plotly.update(this.overallAccPlotDiv.nativeElement)
  }

  async plotEnrichmentScoresByClass(enrichmentData: Promise<Map<string, PlotData>>) {
    // fill subtype specific data
    let data: any[] = [];
    const enrichmentDataResponse = await enrichmentData;
    enrichmentDataResponse.forEach((plotData, subtype) => {
      // push trace for each subtype
      data.push({
        x: plotData.x,
        y: plotData.y,
        fill: "tozeroy",
        type: "scatter",
        mode: "lines",
        opacity: 0.8,
        name: subtype
      });
    });
    // add subplot for each trace
    data.slice(1).forEach((d, i) => {
      let idx: string = (i+2).toString();
      d.xaxis = 'x' + idx
      d.yaxis = 'y' + idx
    });
    // determine range of display
    let minScore: number = Math.round(min(data.map(d => min(d.x))));
    let maxScore: number = Math.round(max(data.map(d => max(d.x))));
    const plot_height: number = data.length * 50;
    // set general layout options
    let layout = {
      showlegend: false,
      autosize: true,
      legend: {"orientation": "h"},
      grid: {
        rows: data.length,
        columns: 1,
        pattern: 'independent',
        roworder: 'bottom to top'
      },
      height: plot_height,
      title: "spongEffects enrichment score density for predictive classes"
    };
    // set constant y axis layout
    const y_axis_layout = {
      showgrid: false,
      automargin: true,
      showticklabels: false,
    };
    const annotations = [];
    // add layout to each trace
    data.forEach((d, index) => {
      let x_axis_layout_i = {
        range: [minScore, maxScore],
        showgrid: false,
        showticklabels: false
      };
      let x_key: string = "xaxis";
      let y_key: string = "yaxis";
      let x: string = "x";
      let y: string = "y";
      if (index != 0) {
        x_key = x_key + (index + 1).toString();
        y_key = y_key + (index + 1).toString();
        x = x + (index + 1).toString();
        y = y + (index + 1).toString();
      } else {
        x_axis_layout_i["title"] = "spongEffects enrichment score";
        x_axis_layout_i.showticklabels = true;
      }
      layout[x_key] = x_axis_layout_i;
      layout[y_key] = y_axis_layout;
      // add class annotation
      annotations.push({
        xref: x,
        yref: y,
        x: minScore + 1.5,
        y: 0.5,
        text: d.name,
        align: "left",
        showarrow: false,
        width: 250
      })
    });
    layout["annotations"] = annotations;
    const config = { responsive: true }
    Plotly.newPlot(this.enrichmentScoresByClassPlotDiv.nativeElement, data, layout, config);
  }

  async resetEnrichmentScoreByClass() {
    Plotly.update(this.enrichmentScoresByClassPlotDiv.nativeElement);
  }

  async plotLollipop(n: number) {
    let giniData: SpongEffectsGeneModules[] = await this.modulesData;
    const redNodes: number = this.markControl.value;
    // only use selected number of top genes
    let idx: number = n > giniData.length ? giniData.length: n;
    giniData = giniData.slice(0, idx);
    // set selected elements
    this.addModules(giniData.slice(0, redNodes))

    // selected elements
    this.filteredModulesData = giniData;

    // set main layout options
    let data: any[] = [{
      x: giniData.map(g => g.mean_gini_decrease),
      y: giniData.map(g => g.mean_accuracy_decrease),
      mode: "markers",
      type: "scatter",
      name: giniData.map(g => g.gene_symbol),
      text: giniData.map(g => g.gene_symbol),
      marker: {
        size: this.defaultMarkerSize,
        color: giniData.map(g => this.selectedModules.includes(g) ? "red": "grey")
      }
    }];
    // set main layout options
    let layout = {
      showlegend: false,
      autosize: true,
      hovermode: "closest",
      margin: {
        b: 50,
        l: 75,
        r: 25,
        t: 0
      },
      xaxis: {
        title: "Mean decrease in Gini-index"
      },
      yaxis: {
        title: "Mean decrease in accuracy"
      }
    }
    let config = {
      responsive: true
    }
    Plotly.newPlot(this.lollipopPlotDiv.nativeElement, data, layout, config);

    // add click handler
    this.lollipopPlotDiv.nativeElement.on("plotly_click", (eventData) => {
      const clickedSymbol: string = eventData.points[0].toString();
      // get modules with clicked element
      const modules: SpongEffectsGeneModules[] = giniData.filter(c => c.gene_symbol == clickedSymbol);
      this.addModules(modules, clickedSymbol);
      // toggle color of clicked point
      const updatedData = this.lollipopPlotDiv.nativeElement.data;
      updatedData[0].marker.color = giniData.map(g => this.selectedModules.includes(g) ? "red": "grey");
      // update plot
      Plotly.redraw(this.lollipopPlotDiv.nativeElement, updatedData, layout, config);
    });
  }

  addModules(modules: SpongEffectsGeneModules[], clickedSymbol?: string) {
    if (clickedSymbol == undefined) {
      this.selectedModules = modules;
    } else {
      // modules are not inserted yet
      if (this.selectedModules.filter(s => s.gene_symbol == clickedSymbol).length == 0) {
        // add new modules
        this.selectedModules.push(...modules);
      } else {
        // remove clicked modules
        this.selectedModules = this.selectedModules.filter(s => s.gene_symbol != clickedSymbol);
      }
    }
    // update dynamic table data
    this.dynamicModulesData.setData(this.selectedModules);
  }

  // predict functions
  onExpressionUpload(event: any) {
    this.uploadedExpressionFiles.push(...event.addedFiles);
    // TODO: check format
  }

  expressionUploaded(): boolean {
    return this.uploadedExpressionFiles.length > 0;
  }

  onRemoveExpression(event) {
    this.uploadedExpressionFiles.splice(this.uploadedExpressionFiles.indexOf(event), 1);
    this.predictionQueried = false;
  }

  acceptExpressionFiles(): string {
    return this.expressionUploaded() ? "none" : this.filesToAccept;
  }

  flipExampleExpression() {
    this.showExpressionExample = !this.showExpressionExample;
  }

  estimateRunTime() {
    const fileSize: number = this.uploadedExpressionFiles[0].size / (1024**2);
    const refSlope: number = 0.7;
    const x0: number = 17;
    const st: number = this.predictSubtypes ? 4 : 1;
    return refSlope * fileSize + x0;
  }

  async getPredictionData(): Promise<any> {
    const uploadedFile: File = this.uploadedExpressionFiles[0];
    // send file and parameters to API and return response
    return this.backend.predictCancerType(
      uploadedFile, this.predictSubtypes, this.logScaling,
      this.mscorControl.value, this.fdrControl.value, this.minSizeControl.value,
      this.maxSizeControl.value, this.minExprControl.value, this.methodDefault
    )
  }


  getColorForValue(value: number): string {
    let g: number = 140;
    let r: number = value >= 0.5 ? Math.round(255*2 * (1 - value)): 255;
    const b: number = 0;
    return `rgb(${r},${g},${b})`;
  }

  async extractPredictions(responseJson: any): Promise<PlotlyData> {
    const typeGroups: Map<string, string[]> = new Map<string, string[]>();
    // group predictions by type
    responseJson.data.forEach(entry => {
      if (typeGroups.has(entry.typePrediction)) {
        typeGroups.get(entry.typePrediction)?.push(entry.subtypePrediction);
      }
    });

    const typeCounts: Map<string, number> = new Map([...typeGroups.entries()].map(entry => {
      return [entry[0], entry[1].length];
    }));
    // sort by amount of samples
    const sortedTypeCounts: Map<string, number> = new Map([...typeCounts.entries()].sort((a, b) => a[1] - b[1]));
    let x: number[] = [...sortedTypeCounts.values()];
    let y: string[] = [...sortedTypeCounts.keys()];
    // add model accuracy
    let classPerformanceData = this.classPerformancePlotDiv.nativeElement.data;
    // get modules data
    classPerformanceData = classPerformanceData.filter(d => d.name == "modules")
    if (classPerformanceData.length > 0) {
      classPerformanceData = classPerformanceData[0];
    }
    // create map to value
    const classToMeasure: Map<string, number> = new Map<string, number>();
    for (let i = 0; i < classPerformanceData.x.length; i++) {
      classToMeasure.set(classPerformanceData.x[i], classPerformanceData.y[i]);
    }
    const accValues: number[] = y.map(x_v => classToMeasure.get(x_v) ?? 0);    // color based on balanced accuracy
    const barColors: string[] = accValues.map(v => this.getColorForValue(v));
    // transform data
    let data = [{
      x: x,
      y: y,
      text: accValues.map(v => "Balanced accuracy: " + v.toString()),
      type: "bar",
      name: "type",
      orientation: "h",
      marker: {
        color: barColors
      }
    }];

    // add subtype traces
    if (this.predictSubtypes) {
      const subtypeTraces: any[] = [...typeGroups.values()].map(sv => {
        return {
          x: sv.length,
          y: y,
          text: sv,
          name: "subtypes",
          orientation: "h"
        }
      });
      data.push(...subtypeTraces);
    }

    const layout = {
      paper_bgcolor: "white",
      autosize: true,
      barmode: "group",
      margin: {
        l: 250,
        r: 25,
        t: 50,
        b: 50
      },
      xaxis: {
        title: "Number of samples classified"
      }
    };
    const config = {
      responsive: true
    }
    return {data: data, layout: layout, config: config};
  }

  async plotPredictions(plotlyData: PlotlyData): Promise<void> {
    Plotly.newPlot(this.typePredictPiePlot.nativeElement, plotlyData.data, plotlyData.layout, plotlyData.config);
  }

  async processPredictions(predictionResponse: any): Promise<any> {
    // check response
    if (!predictionResponse.ok) {
      throw new Error(`File upload failed with status code: ${predictionResponse.status}`);
    }
    // save results
    const predictionData = await predictionResponse.json();
    this.predictionData = predictionData.data;
    this.predictionMeta = predictionData.meta[0];
    this.predictedType = predictionData.meta[0].type_predict;
    this.predictedSubtype = predictionData.meta[0].subtype_predict;
    // plot predictions
    this.extractPredictions(predictionData)
      .then(data => this.plotPredictions(data));
  }

  async startTimer(): Promise<any> {
    this.timerRunning = true;
    this.progressBarValue = 0;
    const totalRunTime: number = this.estimateRunTime();
    this.estimatedRunTime = totalRunTime;
    const interval: number = (1000 * totalRunTime) / 100;
    const progressBarTimer = timer(0, interval);
    progressBarTimer.subscribe(() => {
      this.estimatedRunTime = totalRunTime * (100-this.progressBarValue)/100;
      if (this.progressBarValue < 100) this.progressBarValue++;
    });
  }

  runButtonDisabled(): boolean {
    return !this.expressionUploaded() || this.predictionLoading;
  }

  estimatedRunTimeText(): string {
    return this.estimatedRunTime > 0 ? Math.round(this.estimatedRunTime).toString()+"s": "Any moment...hopefully"
  }

  async predict() {
    this.predictionQueried = true;
    this.predictionLoading = true;
    // start timer of estimated run time
    this.startTimer().then(_ => this.timerRunning = false);
    // start workflow
    this.getPredictionData()
      .then(data => this.processPredictions(data))
      .then(_ => this.predictionLoading = false);
  }

  buttonText(btn: string) {
    if (btn == "expr") {
      return this.showExpressionExample ? "Hide example file" : "Show example file";
    }
    else {
      return "";
    }
  }

  getCancerInfoText(): CancerInfo {
    if (this.selectedCancer == undefined) return {text: ["loading DB data..."], link: ""};
    let cancerInfo: CancerInfo;
    switch (this.selectedCancer.value) {
      case "PANCAN": {
        let texts: string[] = [
          "The Pan-cancer project includes the combined data of 33 of the most common cancer forms in humans.",
        ];
        cancerInfo = {text: texts, link: "https://doi.org/10.1016/j.cell.2018.03.022"};
        break;
      }
      case "BRCA": {
        let texts: string[] = [
          "Breast cancer is the most frequently observed cancer in women and one of the main causes of death in women.",
        ];
        cancerInfo = {text: texts, link: "https://www.nature.com/articles/nature11412"};
        break;
      }
      case "CESC": {
        let texts: string[] = [
          "Cervical cancer is a form of cancer that develops in cervix tissues, i.e. the lower area of the uterus.",
        ];
        cancerInfo = {text: texts, link: "https://www.nature.com/articles/nature21386"};
        break;
      }
      case "ESCA": {
        let texts: string[] = [
          "The TCGA research revealed two predominant forms of esophageal cancer: squamous cell carcinoma, originating from the flat epithelial cells lining the esophagus, and adenocarcinoma, originating from the glandular cells responsible for producing mucus and various fluids.",
        ];
        cancerInfo = {text: texts, link: "https://www.nature.com/articles/nature20805"};
        break;
      }
      case "HNSC": {
        let texts: string[] = [
          "The majority of head and neck cancers initiate in the moist, mucous membranes that line the interior of the mouth, nasal passages, and throat. These membranes consist of squamous cells, and the head and neck cancers that develop within these cells are classified as squamous cell carcinomas.",
        ];
        cancerInfo = {text: texts, link: "https://www.nature.com/articles/nature14129"};
        break;
      }
      case "LGG": {
        let texts: string[] = [
          "Glioma is a form of cancer originating in the brain's glial cells, which play a vital role in supporting and maintaining the health of the brain's nerve cells. Tumors are categorized into grades I, II, III, or IV in accordance with criteria established by the World Health Organization. In this research, TCGA specifically investigated lower-grade gliomas, encompassing grades II and III.",
        ];
        cancerInfo = {text: texts, link: "https://www.nejm.org/doi/full/10.1056/NEJMoa1402121"};
        break;
      }
      case "SARC": {
        let texts: string[] = [
          "The term \"sarcoma\" includes a wide range of uncommon cancers that have the potential to impact soft tissues, bone structures, or even both, spanning various parts of the body.",
        ];
        cancerInfo = {text: texts, link: "https://www.cell.com/cell/fulltext/S0092-8674(17)31203-5"};
        break;
      }
      case "STAD": {
        let texts: string[] = [
          "The occurrence of stomach cancer displays significant variation influenced by a combination of genetic and environmental factors. This type of cancer is more commonly found in men, elderly individuals, and those with a familial predisposition to the disease. On a global scale, the incidence of stomach cancer differs by geographic region.",
        ];
        cancerInfo = {text: texts, link: "https://www.nature.com/articles/nature13480"};
        break;
      }
      case "TGCT": {
        let texts: string[] = [
          "Over 90% of testicular cancers originate from germ cells, which are cells within the testicles responsible for sperm production. This category of cancer is referred to as testicular germ cell cancer. Testicular germ cell cancer can be further categorized as either seminomas or nonseminomas, distinguishable through microscopic examination. Nonseminomas typically exhibit more rapid growth and dissemination compared to seminomas. When a testicular germ cell tumor contains a combination of both subtypes, it is classified as a nonseminoma. TCGA conducted research encompassing both seminomas and nonseminomas.",
        ];
        cancerInfo = {text: texts, link: "https://www.cell.com/cell-reports/fulltext/S2211-1247(18)30785-X"};
        break;
      }
      case "UCEC": {
        let texts: string[] = [
          "Endometrial cancer arises in the cells that compose the inner lining of the uterus, known as the endometrium. It ranks as one of the prevalent cancers affecting the female reproductive system in American women.",
        ];
        cancerInfo = {text: texts, link: "https://www.nature.com/articles/nature12113"};
        break;
      }
      default: {
        let texts: string[] = [
          "No information available for this cancer type."
        ];
        cancerInfo = {text: texts, link: ""};
        break;
      }
    }
    return cancerInfo;
  }
}
