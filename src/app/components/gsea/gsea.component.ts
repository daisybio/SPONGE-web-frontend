import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { Controller } from '../../control';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedService } from '../../shared.service';
import 'datatables.net';
import { FormControl } from "@angular/forms";
import { Options } from '@angular-slider/ngx-slider';

declare var Plotly: any;
declare var $;

@Component({
  selector: 'app-gsea',
  templateUrl: './gsea.component.html',
  styleUrls: ['gsea.component.less']
})


export class GseaComponent implements OnInit, OnChanges {

  @Input() input_disease_name_1: string;
  @Input() input_disease_name_2: string;
  @Input() input_disease_subtype_1: string;
  @Input() input_disease_subtype_2: string;
  @Input() input_condition_1: string;
  @Input() input_condition_2: string;
  @Input() input_gene_set: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private shared_service: SharedService
  ) {}

  TermController = new FormControl();
  TermFilterController = new FormControl();
  geneFilterController = new FormControl();
  lfcFilterController = new FormControl();

  DiseaseName1Controller = new FormControl();
  DiseaseName1FilterController = new FormControl();
  DiseaseName2Controller = new FormControl();
  DiseaseName2FilterController = new FormControl();
  DiseaseSubtype1Controller = new FormControl();
  DiseaseSubtype1FilterController = new FormControl();
  DiseaseSubtype2Controller = new FormControl();
  DiseaseSubtype2FilterController = new FormControl();
  DiseaseCondition1Controller = new FormControl();
  DiseaseCondition1FilterController = new FormControl();
  DiseaseCondition2Controller = new FormControl();
  DiseaseCondition2FilterController = new FormControl();
  GeneSetController = new FormControl();
  GeneSetFilterController = new FormControl();

  disease_name_1_list = [];
  disease_name_2_list = [];
  disease_subtype_1_list = [];
  disease_subtype_2_list = [];
  disease_condition_1_list = [];
  disease_condition_2_list = [];
  gene_set_list = [];
  datasets = [];
  comparisons = [];
  filteredGenes = [];

  disease_name_1: string;
  disease_name_2: string;
  disease_subtype_1: string;
  disease_subtype_2: string;
  condition_1: string;
  condition_2: string;
  gene_set: string;

  controller = new Controller();

  loading = true;

  filteredSets: string[];
  filteredGenesResults: string[];
  diff_expr_lfc: number[];
  filtered_diff_expr_lfc: number[];
  sets: string[] = [];
  gsea_res = {
    es: NaN,
    nes: NaN,
    pvalue: NaN,
    fdr: NaN,
    fwerp: NaN,
    gene_percent: NaN,
    tag_percent: "",
    hits: [],
    lead_genes: [],
    matched_genes: [],
  }

  img_src = ""

  gsea_term_res: any;

  filtered_gsea_term_res: any;

  selected_term: string;

  plot_type = "bar";

  minSetSize: number = 10;
  maxSetSize: number = 90;
  setSizeSliderOptions: Options = {
    floor: 0,
    ceil: 100,
    step: 1,
    noSwitching: true
  };
  
  ngOnInit() {
    this.controller.get_comparison({
      callback: (data) => {
        this.comparisons = data;
        this.disease_name_1_list = [... new Set(data.map(obj => obj.dataset_1.disease_name))];
        this.disease_name_1_list = this.disease_name_1_list.concat([... new Set(data.map(obj => obj.dataset_2.disease_name))]);
        this.disease_name_1 = this.disease_name_1_list[0];
        if(this.disease_name_1_list.includes(this.input_disease_name_1)){
          this.disease_name_1 = this.input_disease_name_1;
        }
        this.DiseaseName1Controller.setValue(this.disease_name_1);

        this.DiseaseSubtype1Change();
      }
    });

    this.TermFilterController.valueChanges.subscribe((value) => {
      this.filteredSets = this.sets.filter(set => set.toLowerCase().includes(value.toLowerCase()));
    });

    this.geneFilterController.valueChanges.subscribe((value) => {
      let indices = this.gsea_res.matched_genes.map((gene, i) => gene.toLowerCase().startsWith(value.toLowerCase()) ? i : '').filter(String);
      this.filteredGenesResults = this.gsea_res.matched_genes.filter((_, i) => indices.includes(i));
      this.filtered_diff_expr_lfc = this.diff_expr_lfc.filter((_, i) => indices.includes(i));
    });

    this.lfcFilterController.valueChanges.subscribe((value) => {
      let indices = this.diff_expr_lfc.map((hit, i) => String(hit).startsWith(value) ? i : '').filter(String);
      this.filteredGenesResults = this.gsea_res.matched_genes.filter((_, i) => indices.includes(i));
      this.filtered_diff_expr_lfc = this.diff_expr_lfc.filter((_, i) => indices.includes(i));
    });

    $("#filter_genes").autocomplete({
      source: ( request, response ) => {
        const searchString = request.term.split( /,\s*/ ).pop(); // only the last item in list
        if (searchString.length > 2) {
          // if search string is engs number, we want to wait with the search until we don't have to load ALL ensg number with sth like "ENSG00..."
          if (searchString.toUpperCase().startsWith('ENSG')) {
            if (searchString.length < 12) {
              return;
            }
          }
          this.controller.search_string({
            searchString,
            callback: (data) => {
              // put all values in a list
              const values = [];
              for (const entry of data) {
                //  we don't support seach for miRNAs
                if ('ensg_number' in entry) {
                  const gene_symbol = entry.gene_symbol ? `(${entry.gene_symbol})` : '';
                  values.push(`${entry.ensg_number} ${gene_symbol}`);
                }
              }
              response(values);
            },
            error: () => {}
          });
        }
      },
      minLength: 3,
      search() {
      },
      response() {
      },
      focus() {
        return false;
      },
      select: ( event, ui ) => {
        const terms = ui.item.value.split(' ');

        if (terms[1].length && terms[1][0] == '(') {
          terms[1] = terms[1].substring(1, terms[1].length - 1);
        }
      $('#filtered_gene_container').append(
          `
          <div style="height:40px">
            <span>${terms[1]}</span>
            <button type="button" class="remove-gene" aria-label="Close" style="background: none; border: none; margin-left: 5px; color: white;">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          `
        )

        this.filteredGenes.push(terms[1]);
        this.GeneSetFilter();
        // reset search field
        event.target.value = '';
        return false;
      }
    });

    $(document).on('click', '#filtered_gene_container .remove-gene', (event) => {
      this.filteredGenes = this.filteredGenes.filter(obj => obj != event.currentTarget.parentElement.getElementsByTagName('span')[0].textContent);
      this.GeneSetFilter();
      event.currentTarget.parentElement.remove()
    });
  }

  ngOnChanges() {
    this.controller.get_comparison({
      callback: (data) => {
        this.comparisons = data;
        this.disease_name_1_list = [... new Set(data.map(obj => obj.dataset_1.disease_name))];
        this.disease_name_1_list = this.disease_name_1_list.concat([... new Set(data.map(obj => obj.dataset_2.disease_name))]);
        this.disease_name_1 = this.disease_name_1_list[0];
        if(this.disease_name_1_list.includes(this.input_disease_name_1)){
          this.disease_name_1 = this.input_disease_name_1;
        }
        this.DiseaseName1Controller.setValue(this.disease_name_1);

        this.DiseaseSubtype1Change();
      }
    });
  }

  to_tsv(array) {
    var keys = ["term", "es", "nes", "pvalue", "fdr", "fwerp", "gene_percent", "tag_percent", "lead_genes", "matched_genes"];

    var result = keys.join("\t") + "\n";

    array.forEach(function(obj){
        result += keys.map(k => obj[k]).join("\t") + "\n";
    });

    return result;
  }

  initialTermChange() {
    this.controller.get_gsea_results({
      disease_name_1: this.disease_name_1,
      disease_name_2: this.disease_name_2,
      disease_subtype_1: this.disease_subtype_1,
      disease_subtype_2: this.disease_subtype_2,
      condition_1: this.condition_1,
      condition_2: this.condition_2,
      gene_set: this.gene_set,
      callback: (data) => {
        this.gsea_term_res = data;
        this.filtered_gsea_term_res = this.gsea_term_res;
        this.sets = this.filtered_gsea_term_res.map(obj => obj.term);
        this.filteredSets = this.sets;
        this.TermController.setValue(this.sets[0]);

        this.minSetSize = Math.min(...this.filtered_gsea_term_res.map(obj => obj.matched_genes.length));
        this.maxSetSize = Math.max(...this.filtered_gsea_term_res.map(obj => obj.matched_genes.length));
        const newOptions: Options = Object.assign({}, this.setSizeSliderOptions);
        newOptions.ceil = this.maxSetSize;
        newOptions.floor = this.minSetSize;
        this.setSizeSliderOptions = newOptions;

        if(this.filtered_gsea_term_res.length > 0){
          if(!document.getElementById("gsea_select_body").hasAttribute("hidden")){
            document.getElementById("gsea_no_results").setAttribute("hidden", "");
            document.getElementById("gsea_results_body").removeAttribute("hidden");  
          }
          document.getElementById("gene_set_filter").removeAttribute("hidden");
          this.termChange(this.sets[0]);
        }else{
          document.getElementById("gsea_no_results").removeAttribute("hidden");
          document.getElementById("gsea_results_body").setAttribute("hidden", "");
        }

        if(this.plot_type == "bar"){
          this.showBarPlot();
        }else{
          this.showVulcanoPlot();
        }
        document.getElementById("gsea_load_body").setAttribute("hidden", "");
        if(!document.getElementById("gsea_select_body").hasAttribute("hidden")){
          document.getElementById("gsea_results_body").removeAttribute("hidden");
        }
        document.getElementById("gene_set_filter").removeAttribute("hidden");
        this.loading = false;
      },
    });
  }

  termChange(selected_term) {
    this.TermController.setValue(selected_term);
    this.selected_term = selected_term;

    let data = this.filtered_gsea_term_res.filter(obj => obj.term == selected_term)[0];
    this.gsea_res.es = data.es;
    this.gsea_res.nes = data.nes;
    this.gsea_res.pvalue = data.pvalue;
    this.gsea_res.fdr = data.fdr;
    this.gsea_res.fwerp = data.fwerp;
    this.gsea_res.gene_percent = data.gene_percent;
    this.gsea_res.tag_percent = data.tag_percent;
    this.gsea_res.lead_genes = data.lead_genes;
    this.gsea_res.matched_genes = data.matched_genes;

    this.filteredGenesResults = this.gsea_res.matched_genes;
    this.addDiffExprInfo(this.gsea_res.matched_genes);

    this.controller.get_gsea_plot({
      disease_name_1: this.disease_name_1,
      disease_name_2: this.disease_name_2,
      disease_subtype_1: this.disease_subtype_1,
      disease_subtype_2: this.disease_subtype_2,
      condition_1: this.condition_1,
      condition_2: this.condition_2,
      gene_set: this.gene_set,
      term: selected_term,
      callback: (data) => {
        this.img_src = data;
      }
    });
  }

  addDiffExprInfo(genes){
    this.controller.get_de_results({
      disease_name_1: this.disease_name_1,
      disease_name_2: this.disease_name_2,
      disease_subtype_1: this.disease_subtype_1,
      disease_subtype_2: this.disease_subtype_2,
      condition_1: this.condition_1,
      condition_2: this.condition_2,
      gene_symbol: genes,
      callback: (data) => {
        data = data.sort((a, b) => (genes.indexOf(a.gene) < genes.indexOf(b.gene) ? -1 : 1));
        data = data.map(obj => obj.log2FoldChange);
        this.diff_expr_lfc = data;
        this.filtered_diff_expr_lfc = this.diff_expr_lfc;
      },
    });
  }

  showBarPlot() {
    this.filtered_gsea_term_res.sort(function(first, second) {
      return second.es - first.es;
    })
    let gsea_res = [].concat(this.filtered_gsea_term_res.slice(0, 10),this.filtered_gsea_term_res.slice(-10));

    let data = [{
      x: gsea_res.map(obj => obj.es),
      y: gsea_res.map(obj => obj.term),
      type: 'bar',
      orientation: 'h',
      hovertext: gsea_res.map(obj => `<b>${obj.term}</b><br>ES=${obj.es}; pval=${obj.pvalue}; fdr=${obj.fdr}; fwerp=${obj.fwerp}<br>gene_percent=${obj.gene_percent}; tag_percent=${obj.tag_percent}:<br>${obj.lead_genes.join(', ')}`),
      hoverinfo: 'hovertext',
      marker : {
        colorscale: 'RdBu',
        color: gsea_res.map(obj => -Math.log10(obj.pvalue) * Math.sign(obj.es)),
        colorbar: {
          title: {
            text: '-log10(pval) * abs(ES)',
            side: 'top'
          },
          orientation: 'h',
        },  
      }
    }];
  
    let layout = {
      xaxis: {
        title: 'Enrichment Score (ES)',
        showgrid: true,
        zeroline: false
      },
      yaxis: {
        showline: false,
        showgrid: true
      },
      width: 550,
      margin:{
        l: 225,
        t: 20
      }
    };
  
    $('#pie_chart_container').empty();
    Plotly.newPlot('pie_chart_container', data, layout);

    $('#pie_chart_container').off('plotly_click');
    $('#pie_chart_container').on('plotly_click', (_, data) => {
      this.termChange(data.points[0].label);
    });

    this.plot_type = "bar";
  }

  showVulcanoPlot() {
    let data = [{
      x: this.filtered_gsea_term_res.map(obj => obj.es),
      y: this.filtered_gsea_term_res.map(obj => -Math.log10(obj.pvalue)),
      name: this.filtered_gsea_term_res.map(obj => obj.term),
      text: this.filtered_gsea_term_res.map(obj => `<b>${obj.term}</b><br>ES=${obj.es}; pval=${obj.pvalue}; fdr=${obj.fdr}; fwerp=${obj.fwerp}<br>gene_percent=${obj.gene_percent}; tag_percent=${obj.tag_percent}:<br>${obj.lead_genes.join(', ')}`),
      hoverinfo: 'text',
      type: 'scatter',
      mode: 'markers',
      marker : {
        colorscale: 'RdBu',
        color: this.filtered_gsea_term_res.map(obj => -Math.log10(obj.pvalue) * Math.sign(obj.es)),
        colorbar: {
          title: {
            text: '-log10(pval) * abs(ES)',
            side: 'top'
          },          
          orientation: 'h',
        },  
      }
    }];
  
    let layout = {
      xaxis: {
        title: 'Enrichment Score (ES)',
        showgrid: true,
        zeroline: false
      },
      yaxis: {
        title: '-log10(pval)',
        showline: false,
        showgrid: true
      },
      width: 550,
      margin:{
        t: 20
      }
    };
  
    $('#pie_chart_container').empty();
    Plotly.newPlot('pie_chart_container', data, layout)

    $('#pie_chart_container').off('plotly_click');
    $('#pie_chart_container').on('plotly_click', (_, data) => {
      this.termChange(data.points[0].data.name[data.points[0].pointNumber]);
    });

    this.plot_type = "vulcano";
  }

  gsea_download(){
    let out = this.to_tsv(this.filtered_gsea_term_res);

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(out));
    element.setAttribute('download', `gsea_${this.disease_name_1}_${this.disease_subtype_1}_${this.condition_1}_${this.disease_name_2}_${this.disease_subtype_2}_${this.condition_2}_${this.gene_set}.tsv`);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }

  plot_download(){
    var element = document.createElement('a');
    element.setAttribute('href', 'data:application/octet-stream;base64,'+this.img_src);
    element.setAttribute('download', `${this.disease_name_1}_${this.disease_subtype_1}_${this.condition_1}_${this.disease_name_2}_${this.disease_subtype_2}_${this.condition_2}_${this.selected_term}.png`);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }

  GeneSetFilter(){
    this.filtered_gsea_term_res = this.gsea_term_res.filter(obj => obj.matched_genes.length >= this.minSetSize && obj.matched_genes.length <= this.maxSetSize);
    this.filtered_gsea_term_res = this.filtered_gsea_term_res.filter(obj => this.filteredGenes.every(g => obj.matched_genes.includes(g)))

    this.sets = this.filtered_gsea_term_res.map(obj => obj.term);
    this.filteredSets = this.sets;
    this.TermController.setValue(this.sets[0]);

    if(this.filtered_gsea_term_res.length > 0){
      document.getElementById("gsea_no_results").setAttribute("hidden", "");
      document.getElementById("gsea_results_body").removeAttribute("hidden");
      this.termChange(this.sets[0]);
    }else{
      document.getElementById("gsea_no_results").removeAttribute("hidden");
      document.getElementById("gsea_results_body").setAttribute("hidden", "");
    }

    if(this.plot_type == "bar"){
      this.showBarPlot();
    }else{
      this.showVulcanoPlot();
    }
  }

  DiseaseSubtype1Change(){
    this.disease_subtype_1_list = [... new Set(this.comparisons.filter(obj => obj.dataset_1.disease_name == this.disease_name_1).map(obj => obj.dataset_1.disease_subtype))];
    this.disease_subtype_1_list = this.disease_subtype_1_list.concat([... new Set(this.comparisons.filter(obj => obj.dataset_2.disease_name == this.disease_name_1).map(obj => obj.dataset_2.disease_subtype))]);
    this.disease_subtype_1_list = this.disease_subtype_1_list.map(obj => obj == null ? "Main Type" : obj)
    this.disease_subtype_1 = this.disease_subtype_1_list[0];

    if(this.disease_name_1_list.includes(this.input_disease_subtype_1)){
      this.disease_subtype_1 = this.input_disease_subtype_1;
    }
    this.DiseaseSubtype1Controller.setValue(this.disease_subtype_1);
    this.disease_subtype_1 = this.disease_subtype_1 == "Main Type" ? null : this.disease_subtype_1;

    this.DiseaseCondition1Change();
  }
  DiseaseCondition1Change(){
    this.disease_condition_1_list = [... new Set(this.comparisons.filter(obj => (obj.dataset_1.disease_name == this.disease_name_1 && obj.dataset_1.disease_subtype == this.disease_subtype_1)).map(obj => obj.condition_1))];
    this.disease_condition_1_list = this.disease_condition_1_list.concat([... new Set(this.comparisons.filter(obj => (obj.dataset_2.disease_name == this.disease_name_1 && obj.dataset_2.disease_subtype == this.disease_subtype_1)).map(obj => obj.condition_2))]);
    
    this.condition_1 = this.disease_condition_1_list[0];
    if(this.disease_condition_1_list.includes(this.input_condition_1)){
      this.condition_1 = this.input_condition_1;
    }
    this.DiseaseCondition1Controller.setValue(this.condition_1);

    this.DiseaseName2Change();
  }
  DiseaseName2Change(){
    this.disease_name_2_list = [... new Set(this.comparisons.filter(obj => (obj.dataset_1.disease_name == this.disease_name_1 && obj.dataset_1.disease_subtype == this.disease_subtype_1 && obj.condition_1 == this.condition_1)).map(obj => obj.dataset_2.disease_name))];
    this.disease_name_2_list = this.disease_name_2_list.concat([... new Set(this.comparisons.filter(obj => (obj.dataset_2.disease_name == this.disease_name_1 && obj.dataset_2.disease_subtype == this.disease_subtype_1 && obj.condition_2 == this.condition_1)).map(obj => obj.dataset_1.disease_name))]);

    this.disease_name_2 = this.disease_name_2_list[0];
    if(this.disease_name_2_list.includes(this.input_disease_name_2)){
      this.disease_name_2 = this.input_disease_name_2;
    }
    this.DiseaseName2Controller.setValue(this.disease_name_2);
    
    this.DiseaseSubtype2Change();
  }
  DiseaseSubtype2Change(){
    this.disease_subtype_2_list = [... new Set(this.comparisons.filter(obj => (obj.dataset_1.disease_name == this.disease_name_1 && obj.dataset_1.disease_subtype == this.disease_subtype_1 && obj.condition_1 == this.condition_1 && obj.dataset_2.disease_name == this.disease_name_2)).map(obj => obj.dataset_2.disease_subtype))];
    this.disease_subtype_2_list = this.disease_subtype_2_list.concat([... new Set(this.comparisons.filter(obj => (obj.dataset_2.disease_name == this.disease_name_1 && obj.dataset_2.disease_subtype == this.disease_subtype_1 && obj.condition_2 == this.condition_1 && obj.dataset_1.disease_name == this.disease_name_2)).map(obj => obj.dataset_1.disease_subtype))]);
    this.disease_subtype_2_list = this.disease_subtype_2_list.map(obj => obj == null ? "Main Type" : obj)

    this.disease_subtype_2 = this.disease_subtype_2_list[0];
    if(this.disease_subtype_2_list.includes(this.input_disease_subtype_2)){
      this.disease_subtype_2 = this.input_disease_subtype_2;
    }
    this.DiseaseSubtype2Controller.setValue(this.disease_subtype_2);
    this.disease_subtype_2 = this.disease_subtype_2 == "Main Type" ? null : this.disease_subtype_2;

    this.DiseaseCondition2Change();
  }
  DiseaseCondition2Change(){
    this.disease_condition_2_list = [... new Set(this.comparisons.filter(obj => (obj.dataset_1.disease_name == this.disease_name_1 && obj.dataset_1.disease_subtype == this.disease_subtype_1 && obj.condition_1 == this.condition_1 && obj.dataset_2.disease_name == this.disease_name_2 && obj.dataset_2.disease_subtype == this.disease_subtype_2)).map(obj => obj.condition_2))];
    this.disease_condition_2_list = this.disease_condition_2_list.concat([... new Set(this.comparisons.filter(obj => (obj.dataset_2.disease_name == this.disease_name_1 && obj.dataset_2.disease_subtype == this.disease_subtype_1 && obj.condition_2 == this.condition_1 && obj.dataset_1.disease_name == this.disease_name_2 && obj.dataset_1.disease_subtype == this.disease_subtype_2)).map(obj => obj.condition_1))]);

    this.condition_2 = this.disease_condition_2_list[0];
    if(this.disease_condition_2_list.includes(this.input_condition_2)){
      this.condition_2 = this.input_condition_2;
    }
    this.DiseaseCondition2Controller.setValue(this.condition_2);
    
    this.GeneSetChange();
  }
  GeneSetChange(){
    this.controller.get_gsea_sets({
      disease_name_1: this.disease_name_1,
      disease_name_2: this.disease_name_2,
      disease_subtype_1: this.disease_subtype_1,
      disease_subtype_2: this.disease_subtype_2,
      condition_1: this.condition_1,
      condition_2: this.condition_2,
      callback: (data) => {
        this.gene_set_list = data.map(obj => obj.gene_set);

        this.gene_set = this.gene_set_list[0];
        if(this.gene_set_list.includes(this.input_gene_set)){
          this.gene_set = this.input_gene_set;
        }
        this.GeneSetController.setValue(this.gene_set);
    
        this.LoadResult();
      }
    });
  }

  SetName1(value){
    this.disease_name_1 = value;
    this.DiseaseName1Controller.setValue(value);
    this.DiseaseSubtype1Change();
  }
  SetSubtype1(value){
    this.disease_subtype_1 = value == "Main Type" ? null : value;
    this.DiseaseSubtype1Controller.setValue(value);
    this.DiseaseCondition1Change();
  }
  SetCondition1(value){
    this.condition_1 = value;
    this.DiseaseCondition1Controller.setValue(value);
    this.DiseaseName2Change();
  }
  SetName2(value){
    this.disease_name_2 = value;
    this.DiseaseName2Controller.setValue(value);
    this.DiseaseSubtype2Change();
  }
  SetSubtype2(value){
    this.disease_subtype_2 = value == "Main Type" ? null : value;
    this.DiseaseSubtype2Controller.setValue(value);
    this.DiseaseCondition2Change();
  }
  SetCondition2(value){
    this.condition_2 = value;
    this.DiseaseCondition2Controller.setValue(value);
    this.GeneSetChange();
  }
  SetGeneSet(value){
    this.gene_set = value;
    this.GeneSetController.setValue(value);
    this.LoadResult();
  }

  LoadResult(){
    document.getElementById("gsea_results_body").setAttribute("hidden", "");
    document.getElementById("gene_set_filter").setAttribute("hidden", "");
    document.getElementById("gsea_load_body").removeAttribute("hidden");
    this.loading = true;
    this.initialTermChange();
  }
}
