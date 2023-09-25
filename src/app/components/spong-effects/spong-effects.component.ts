import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {sum} from 'simple-statistics';
import * as d3 from "d3-color";

declare var Plotly: any;

export class Cancer {
  value: string;
  viewValue: string;
  allSubTypes: string[];

  base: string = "https://portal.gdc.cancer.gov/projects/TGCA-";

  constructor(value: string, viewValue: string, allSubTypes: string[]) {
    this.value = value;
    this.viewValue = viewValue;
    this.allSubTypes = allSubTypes;
  }

  toString() {
    return this.viewValue + " - (" + this.value + ")";
  }

  getUrl() {
    return this.base + this.value
  }
}

export const CANCERS: Cancer[] = [
  new Cancer("PANCAN", "Pan-cancer", ["HNSC", "BRCA", "KIRC", "SARC", "OV", "THYM", "LGG", "PCPG", "LIHC", "PAAD", "COAD", "KIRP", "LUAD", "UCEC", "THCA", "BLCA", "PRAD", "TGCT", "STAD", "LUSC", "ESCA", "CESC"]),
  new Cancer("HNSC", "Head & neck squamous cell carcinoma", ["Squamous cell carcinoma, NOS", "Squamous cell carcinoma, keratinizing, NOS", "Basaloid squamous cell carcinoma", "Squamous cell carcinoma, large cell, nonkeratinizing, NOS", "Squamous cell carcinoma, spindle cell"]),
  new Cancer("BRCA", "Breast invasive carcinoma", ["Infiltrating duct carcinoma, NOS", "Adenoid cystic carcinoma", "Apocrine adenocarcinoma", "Lobular carcinoma, NOS", "Phyllodes tumor, malignant", "Infiltrating duct and lobular carcinoma", "Secretory carcinoma of breast", "Infiltrating duct mixed with other types of carcinoma", "Infiltrating lobular mixed with other types of carcinoma", "Intraductal papillary adenocarcinoma with invasion", "Carcinoma, NOS", "Intraductal micropapillary carcinoma", "Tubular adenocarcinoma", "Cribriform carcinoma, NOS", "Metaplastic carcinoma, NOS", "Medullary carcinoma, NOS", "Mucinous adenocarcinoma", "Pleomorphic carcinoma", "Paget disease and infiltrating duct carcinoma of breast", "Papillary carcinoma, NOS", "Large cell neuroendocrine carcinoma", "Basal cell carcinoma, NOS"]),
  new Cancer("KIRC", "Kidney clear cell carcinoma", ["Clear cell adenocarcinoma, NOS", "Renal cell carcinoma, NOS"]),
  new Cancer("SARC", "Sarcoma", ["Leiomyosarcoma, NOS", "Myxoid leiomyosarcoma", "Malignant fibrous histiocytoma", "Fibromyxosarcoma", "Synovial sarcoma, spindle cell", "Giant cell sarcoma", "Undifferentiated sarcoma", "Pleomorphic liposarcoma", "Dedifferentiated liposarcoma", "Malignant peripheral nerve sheath tumor", "Synovial sarcoma, NOS", "Synovial sarcoma, biphasic", "Abdominal fibromatosis", "Liposarcoma, well differentiated", "Aggressive fibromatosis"]),
  new Cancer("OV", "Ovarian serous cystadenocarcinoma", ["Serous cystadenocarcinoma, NOS", "Papillary serous cystadenocarcinoma", "Serous surface papillary carcinoma", "Cystadenocarcinoma, NOS"]),
  new Cancer("THYM", "Thymoma", ["Serous cystadenocarcinoma, NOS", "Papillary serous cystadenocarcinoma", "Serous surface papillary carcinoma", "Cystadenocarcinoma, NOS"]),
  new Cancer("LGG", "Brain lower grade glioma", ["Mixed glioma", "Oligodendroglioma, anaplastic", "Astrocytoma, anaplastic", "Oligodendroglioma, NOS", "Astrocytoma, NOS"]),
  new Cancer("PCPG", "Pheochromocytoma & Paraganglioma", ["Pheochromocytoma, malignant", "Pheochromocytoma, NOS", "Paraganglioma, malignant", "Extra-adrenal paraganglioma, malignant", "Extra-adrenal paraganglioma, NOS", "Paraganglioma, NOS"]),
  new Cancer("LIHC", "Liver hepatocellular carcinoma", ["Hepatocellular carcinoma, NOS", "Combined hepatocellular carcinoma and cholangiocarcinoma", "Hepatocellular carcinoma, fibrolamellar", "Hepatocellular carcinoma, clear cell type", "Clear cell adenocarcinoma, NOS", "Hepatocellular carcinoma, spindle cell variant"]),
  new Cancer("PAAD", "Pancreatic adenocarcinoma", ["Infiltrating duct carcinoma, NOS", "Neuroendocrine carcinoma, NOS", "Adenocarcinoma, NOS", "Adenocarcinoma with mixed subtypes", "Mucinous adenocarcinoma", "Carcinoma, undifferentiated, NOS"]),
  new Cancer("COAD", "Colon adenocarcinoma", ["Adenocarcinoma, NOS", "Mucinous adenocarcinoma", "Papillary adenocarcinoma, NOS", "Adenocarcinoma with neuroendocrine differentiation", "Carcinoma, NOS", "Adenosquamous carcinoma", "Adenocarcinoma with mixed subtypes"]),
  new Cancer("KIRP", "Kidney papillary cell carcinoma", ["Papillary adenocarcinoma, NOS"]),
  new Cancer("LUAD", "Lung adenocarcinoma", ["Adenocarcinoma, NOS", "Bronchiolo-alveolar carcinoma, non-mucinous", "Adenocarcinoma with mixed subtypes", "Bronchio-alveolar carcinoma, mucinous", "Bronchiolo-alveolar adenocarcinoma, NOS", "Papillary adenocarcinoma, NOS", "Mucinous adenocarcinoma", "Acinar cell carcinoma", "Micropapillary carcinoma, NOS", "Solid carcinoma, NOS", "Signet ring cell carcinoma", "Clear cell adenocarcinoma, NOS"]),
  new Cancer("UCEC", "Uterine corpus endometrioid carcinoma", ["Endometrioid adenocarcinoma, NOS", "Serous cystadenocarcinoma, NOS", "Papillary serous cystadenocarcinoma", "Clear cell adenocarcinoma, NOS", "Carcinoma, undifferentiated, NOS", "Endometrioid adenocarcinoma, secretory variant", "Adenocarcinoma, NOS", "Serous surface papillary carcinoma"]),
  new Cancer("THCA", "Thyroid carcinoma", ["Papillary adenocarcinoma, NOS", "Papillary carcinoma, follicular variant", "Papillary carcinoma, columnar cell", "Nonencapsulated sclerosing carcinoma", "Carcinoma, NOS", "Follicular carcinoma, minimally invasive", "Oxyphilic adenocarcinoma", "Follicular adenocarcinoma, NOS"]),
  new Cancer("BLCA", "Bladder urothelial carcinoma", ["Transitional cell carcinoma", "Papillary transitional cell carcinoma", "Papillary adenocarcinoma, NOS", "Squamous cell carcinoma, NOS", "Carcinoma, NOS"]),
  new Cancer("PRAD", "Prostate adenocarcinoma", ["Adenocarcinoma, NOS", "Infiltrating duct carcinoma, NOS", "Adenocarcinoma with mixed subtypes", "Mucinous adenocarcinoma"]),
  new Cancer("TGCT", "Testicular germ cell tumor", ["Embryonal carcinoma, NOS", "Seminoma, NOS", "Mixed germ cell tumor", "Yolk sac tumor", "Teratoma, malignant, NOS", "Teratoma, benign", "Teratocarcinoma"]),
  new Cancer("STAD", "Stomach adenocarcinoma", ["Adenocarcinoma, NOS", "Tubular adenocarcinoma", "Adenocarcinoma, intestinal type", "Papillary adenocarcinoma, NOS", "Carcinoma, diffuse type", "Signet ring cell carcinoma", "Mucinous adenocarcinoma", "Adenocarcinoma with mixed subtypes"]),
  new Cancer("LUSC", "Lung squamous cell carcinoma", ["Squamous cell carcinoma, NOS", "Squamous cell carcinoma, keratinizing, NOS", "Papillary squamous cell carcinoma", "Basaloid squamous cell carcinoma", "Squamous cell carcinoma, large cell, nonkeratinizing, NOS", "Squamous cell carcinoma, small cell, nonkeratinizing"]),
  new Cancer("ESCA", "Esophageal carcinoma", ["Adenocarcinoma, NOS", "Squamous cell carcinoma, NOS", "Squamous cell carcinoma, keratinizing, NOS", "Basaloid squamous cell carcinoma", "Tubular adenocarcinoma", "Mucinous adenocarcinoma"]),
  new Cancer("CESC", "Cervical squamous cell carcinoma & endocervical adenocarcinoma", ["Squamous cell carcinoma, large cell, nonkeratinizing, NOS", "Squamous cell carcinoma, NOS", "Mucinous adenocarcinoma, endocervical type", "Squamous cell carcinoma, keratinizing, NOS", "Adenocarcinoma, endocervical type", "Adenocarcinoma, NOS", "Endometrioid adenocarcinoma, NOS", "Adenosquamous carcinoma", "Basaloid squamous cell carcinoma", "Papillary squamous cell carcinoma"])
];

export const spongEffectsCancerAbbreviations: string[] = ['PANCAN', 'BRCA', 'CESC', 'ESCA', 'HNSC', 'LGG', 'SARC', 'STAD', 'TGCT', 'UCEC']
export const SPONG_EFFECTS_CANCERS: Cancer[] = CANCERS.filter(c => spongEffectsCancerAbbreviations.includes(c.value));

export interface Metric {
  name: string,
  train: number,
  test: number,
  level: number
}

export interface SelectElement {
  value: string,
  viewValue: string
}

export interface MeanGiniDecrease {
  ensemblId: string,
  giniDecrease: number
}

export interface ExampleExpression {
  id: string;
  sample1: number;
  sample2: number;
  sample3: number;
  sample4: number;
  sampleN: number;
}

const EXAMPLE_GENE_EXPR: ExampleExpression[] = [
  {id: "ENSG00000000233", sample1: 6, sample2: 5, sample3: 8, sample4: 2, sampleN: 1},
  {id: "ENSG00000000412", sample1: 2, sample2: 1, sample3: 2, sample4: 3, sampleN: 4},
  {id: "ENSG00000000442", sample1: 10, sample2: 9, sample3: 8, sample4: 0, sampleN: 7}
]

export interface CancerInfo {
  text: string[],
  link: string;
}

export interface PlotData {
  x: number[],
  y: number[]
}

export interface PlotlyData {
  data: any,
  layout?: any,
  config?: any
}

export interface Tab extends SelectElement {
  icon: string
}


@Component({
  selector: 'app-spong-effects',
  templateUrl: './spong-effects.component.html',
  styleUrls: ['./spong-effects.component.less']
})

export class SpongEffectsComponent implements OnInit, AfterViewInit {
  tabs: Tab[] = [
    {value: "explore", viewValue: "Explore", icon: "../../../assets/img/magnifying_glass.png"},
    {value: "predict", viewValue: "Predict", icon: "../../../assets/img/chip-intelligence-processor-svgrepo-com.png"}
  ]
  selectedTab: Tab = this.tabs[0];
  cancers: Cancer[] = SPONG_EFFECTS_CANCERS;
  selectedCancer: Cancer = this.cancers[0];
  levels: string[] = ["Gene", "Transcript"];
  level: string = this.levels[0];
  expandResults: boolean = false;

  // plot divs
  @ViewChild("sampleDistributionPie") sampleDistributionPieDiv: ElementRef;
  @ViewChild("overallAccuracyPlot") overallAccPlotDiv: ElementRef;
  @ViewChild("enrichmentScoresByClassPlot") enrichmentScoresByClassPlotDiv: ElementRef;
  @ViewChild("lollipopPlot") lollipopPlotDiv: ElementRef;
  @ViewChild("moduleExpressionHeatmapDiv") moduleExpressionHeatmap: ElementRef;
  @ViewChild("moduleMiRnaExpressionBarsDiv") moduleMiRnaExpressionBars: ElementRef;

  // lollipop plot
  meanGiniDecrease: MeanGiniDecrease[] = [];
  scores: SelectElement[] = [
    {value: "gini", viewValue: "Gini index"},
    {value: "btw", viewValue: "Betweenness"},
    {value: "ev", viewValue: "Eigenvector"}
  ]
  score: SelectElement = this.scores[0];
  topControl: FormControl = new FormControl(10, [Validators.min(3.0), Validators.max(20)]);
  availableEnsemblIds: string[] = [];
  selectedEnsemblId: string;

  // plot parameters
  defaultPlotMode: string = "lines+markers";
  defaultLineWidth: number = 5;
  defaultMarkerSize: number = 8;

  /* predict variables */
  uploadedExpressionFiles: File[] = [];
  filesToAccept: string = "text/*,application/*";
  possibleSeparators: string[] = ["\t", ",", " "]
  // default parameters
  mscorDefault: number = 0.1;
  fdrDefault: number = 0.05;
  binSizeDefault: number = 100;
  minSizeDefault: number = 100;
  maxSizeDefault: number = 2000;
  minExprDefault: number = 10;
  methodDefault: string = "OE";
  cvFoldsDefault: number = 10;
  showExpressionExample: boolean = false;

  mscorControl = new FormControl("", [Validators.min(0.0), Validators.max(10.0)]);
  fdrControl = new FormControl("", [Validators.min(0.0), Validators.max(0.5)]);
  minExprControl = new FormControl("", [Validators.min(0.0), Validators.max(1000)]);
  binSizeControl = new FormControl("", [Validators.min(0.0), Validators.max(1000)]);
  minSizeControl = new FormControl("", [Validators.min(0.0), Validators.max(5000)]);
  maxSizeControl = new FormControl("", [Validators.min(0.0), Validators.max(5000)]);
  cvFoldsControl = new FormControl("", [Validators.min(0.0), Validators.max(20)]);
  methods: string[] = ["OE", "ssGSEA", "GSVA"];

  exampleExpressionData: MatTableDataSource<any> = new MatTableDataSource<any>(EXAMPLE_GENE_EXPR);
  displayedCols: string[] = ["id", "sample1", "sample2", "sample3", "sample4", "sampleN"];
  displayedColsValueMap: Map<string, string> = new Map<string, string>([
    ["id", ""],
    ["sample1", "sample1"], ["sample2", "sample2"], ["sample3", "sample3"], ["sample4", "sample4"], ["sampleN", "sampleN"],
  ]);

  constructor() {}

  ngOnInit(): void {
  }

  getCancerInfo() {

  }

  ngAfterViewInit() {
    this.cancerSelected(this.selectedCancer);
  }

  setTab(tab: Tab) {
    this.selectedTab = tab;
    // reset explore tab
    if (tab.value == this.tabs[0].value) {
      this.cancerSelected(this.selectedCancer);
    }
  }

  setLevel(level: string) {
    this.level = level;
  }

  getLevelButtonStyle(level: string): string {
    if (level == this.level) {
      return "background-color: #1e719b; color: white";
    } else {
      return "background-color: white";
    }
  }

  getCancerImage() {
    return "../../../assets/img/TCGA/" + this.selectedCancer.value + ".png";
  }

  setPreviewCancer(cancer: Cancer) {
    this.selectedCancer = cancer;
    this.plotSampleDistribution(this.getSampleDistributionData());
  }

  clearResults() {
    // collapse tab
    this.expandResults = false;
  }

  plotResults() {
    if (this.expandResults) return null;
    // get accuracy data from API
    let acData: Metric[] = this.getOverallAccuracyData();
    // show according plot
    this.plotOverallAccuracyPlot(acData);
    // get spongEffect scores from API
    let enrichmentScores: Map<string, PlotData> = this.getSpongEffectScores();
    // plot enrichment score class distributions
    this.plotEnrichmentScoresByClass(enrichmentScores);
    // get top centralities
    this.meanGiniDecrease = this.getMeanGiniDecrease();
    // plot lollipop plot
    this.plotLollipop(this.meanGiniDecrease, this.topControl.value);
    // plot module heatmap and miRNA counts for selected ensembl id
    this.plotSelectedEnsemblId();
  }

  cancerSelected(cancer: Cancer) {
    this.selectedCancer = cancer;
    this.selectedEnsemblId = undefined;
    // load sample distribution
    let sampleDistData: PlotlyData = this.getSampleDistributionData();
    // plot sample distribution pie
    this.plotSampleDistribution(sampleDistData);
    this.clearResults();
  }

  resetLollipop() {
    this.plotLollipop(this.meanGiniDecrease, this.topControl.value);
  }

  plotSelectedEnsemblId() {
    // TODO: split samples into conditions
    // module expression heatmap
    let config: PlotlyData = this.getModuleExpressionDataTest(this.selectedEnsemblId);
    this.plotModuleExpression(config);
    // miRNA expression bar charts
    // this.plotModuleMiRnaExpression(this.getModuleMiRnaExpressionDataTest(this.selectedEnsemblId));
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
    let data = [
      {
        values: this.selectedCancer.allSubTypes.map(() => this.getRandomValue(10, 200, true)),
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
        text: "Sample distribution of " + this.selectedCancer.value + " (" + sum(data[0].values) + " samples)",
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

  getOverallAccuracyData(): Metric[] {
    let testData: Metric[] = [];
    let models: string[] = ["Random modules", "SpongEffects modules", "Central genes"];
    // generate random stats
    models.forEach((model, i) => {
      testData.push({
        name: model, train: this.getRandomValue(0.5, 1), test: this.getRandomValue(0.5, 1), level: i
      })
    })
    return testData;
  }

  getSpongEffectScores(): Map<string, PlotData> {
    let spongEffectsScores: Map<string, PlotData> = new Map<string, PlotData>();
    let subtypes: string[] = this.selectedCancer.allSubTypes;
    let n: number = 6;
    let start: number = 0;
    let stop: number = 14;
    // generate distribution for each subtype
    for (let i of Array.from(Array(subtypes.length).keys())) {
      let min: number = start + i;
      let max: number = stop + i;
      let type: string = subtypes[i];
      let x: number[] = Array.from(Array(n).keys());
      let y: number[] = [];
      // generate random dummy scores
      for (let i = 0; i < n; i++) {
        const randomValue: number = Math.random();
        const scaled: number = (max - (min)) * randomValue + (min);
        y.push(scaled);
      }
      spongEffectsScores.set(
        type,
        {x: x, y: y}
      )
    }
    return spongEffectsScores;
  }

  getMeanGiniDecrease(): MeanGiniDecrease[] {
    let meanGiniDecrease: MeanGiniDecrease[] = [];
    let genes: string[] = this.getRandomElements(10, this.level.toLowerCase());
    for (let gene of genes) {
      meanGiniDecrease.push({ensemblId: gene, giniDecrease: this.getRandomValue(5, 15)});
    }
    return meanGiniDecrease;
  }

  getModuleExpressionData(hubId: string): PlotlyData {
    let apiResponse = [
      {
        "dataset": "testicular germ cell tumor",
        "expr_value": -9.9658,
        "gene": {
          "ensg_number": "ENSG00000259090",
          "gene_symbol": "SEPT7P1"
        },
        "sample_ID": "TCGA-SN-A6IS-01",
        "disease_subtype": "Semninoma"
      },
      {
        "dataset": "testicular germ cell tumor",
        "expr_value": -9.9658,
        "gene": {
          "ensg_number": "ENSG00000259090",
          "gene_symbol": "SEPT7P1"
        },
        "sample_ID": "TCGA-2G-AAG5-01",
        "disease_subtype": "Semninoma"
      }];
    let xSamples: string[] = [];
    let yElements: string[] = [];
    let zValues: number[][] = [[]];
    apiResponse.forEach((data, i) => {
      xSamples.push(data.sample_ID);
      yElements.push(data.gene.gene_symbol);
      zValues[i].push(data.expr_value);
    });
    return {data: null};
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
      // legend: {orientation: "h"},
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
    const yGap: number = 0.25;
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
    Plotly.newPlot(this.moduleMiRnaExpressionBars.nativeElement, config.data, config.layout, config.config);
  }

  plotOverallAccuracyPlot(metricData: Metric[]) {
    // set main layout options
    let layout = {
      yaxis: {
        showline: false,
        showticklabels: false
      },
      annotations: [
        // main title
        {
          xref: "paper",
          yref: "paper",
          x: 0.5,
          y: 1.05,
          xanchor: "center",
          yanchor: "bottom",
          text: "Prediction performance of spongEffects models",
          font:{
            family: "Arial",
            size: 20
          },
          showarrow: false
        },
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
      ]
    };
    let data = metricData.map(metric => {
      // data points
      return {
        x: [metric.train, metric.test],
        y: [metric.level, metric.level],
        mode: this.defaultPlotMode,
        name: metric.name,
        text: ["Train", "Test"],
        hovertemplate: "<i>%{text}: %{x:.2f}</i>",
        line: {width: this.defaultLineWidth},
        marker: {
          size: this.defaultMarkerSize,
          symbol: ['circle', 'diamond']
        }
      }
    });
    // data labels
    Plotly.newPlot(this.overallAccPlotDiv.nativeElement, data, layout);
  }

  plotEnrichmentScoresByClass(enrichmentData: Map<string, PlotData>) {
    // fill subtype specific data
    let data: any[] = [];
    enrichmentData.forEach((plotData, subtype) => {
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
    // set layout options
    let layout = {
      showlegend: true,
      height: 300,
      xaxis: {
        showgrid: false,
        showticklabels: false
      },
      yaxis: {
        showgrid: false,
        automargin: true,
        showticklabels: false,
      },
      legend: {"orientation": "h"}
    };
    Plotly.newPlot(this.enrichmentScoresByClassPlotDiv.nativeElement, data, layout);
  }

  plotLollipop(giniData: MeanGiniDecrease[], n: number) {
    // sort for now but don't need to later, will be sorted by api / saved as sorted entries
    giniData = giniData.sort((a,b) => a.giniDecrease - b.giniDecrease);
    // only use selected number of top genes
    let idx: number = n > giniData.length ? 0 : giniData.length - n;
    giniData = giniData.slice(idx, giniData.length);
    let data: any[] = [];
    let candidates: string[] = [];
    giniData.forEach((g, i) => {
      candidates.push(g.ensemblId);
      data.push({
        x: [0, g.giniDecrease],
        y: [i, i],
        mode: this.defaultPlotMode,
        name: g.ensemblId,
        line: {
          width: this.defaultLineWidth,
          color: i==giniData.length-1 ? "red": "grey"
        },
        marker: {size: this.defaultMarkerSize}
      })
    });
    // set main layout options
    let layout = {
      showlegend: false,
      hovermode: false,
      autosize: true,
      margin: {
        b: 50,
        l: 125,
        r: 5,
        t: 50
      },
      yaxis: {
        tickmode: "array",
        tickvals: Array.from(Array(giniData.length).keys()),
        ticktext: giniData.map(g => g.ensemblId),
        automargin: true
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
          text: "Mean decrease in Gini-index",
          showarrow: false
        }
      ]
    };
    let config = {
      responsive: true
    }
    Plotly.newPlot(this.lollipopPlotDiv.nativeElement, data, layout, config);
    // add click handler
    this.lollipopPlotDiv.nativeElement.on("plotly_click", (eventData) => {

    });
    // set available options
    this.availableEnsemblIds = candidates.reverse();
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
  }

  acceptExpressionFiles(): string {
    return this.expressionUploaded() ? "none" : this.filesToAccept;
  }

  flipExampleExpression() {
    this.showExpressionExample = !this.showExpressionExample;
  }

  buttonText(btn: string) {
    if (btn == "expr") {
      return this.showExpressionExample ? "Hide example file" : "Show example file";
    }
  }

  getCancerInfoText(): CancerInfo {
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
    }
    return cancerInfo;
  }
}
