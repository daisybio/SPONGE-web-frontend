import { Component, OnInit } from '@angular/core';
import { Controller } from "../../control";
import { Helper } from "../../helper";
import { ActivatedRoute } from "@angular/router";
import 'datatables.net';
import { all } from 'q';
import { callbackify } from 'util';
import { JsonPipe } from '@angular/common';
import { parse } from 'querystring';
declare var Plotly: any;
declare var $;

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.less']
})
export class SearchComponent implements OnInit {

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {

    const controller = new Controller()
    const helper = new Helper()

    var search_key: string;
    var limit: number = 20;
    var parsed_search_result: any;
   

    this.route.queryParams
      .subscribe(params => {
        search_key = decodeURIComponent(params.search_key);
      });

    
    $('#options_gene_go').click( () => {
      search_key = $('#gene_search_keys').val()
      limit = $('#gene_input_limit').val()
      search(limit)
    })

    $('#options_mirna_go').click( () => {
      search_key = $('#mirna_search_keys').val()
      limit = $('#mirna_input_limit').val()
      search(limit)
    })


    search(limit)


    function search(limit) {
      // clear older search-results
      $('#key_information').empty()
      $('#disease_accordion').empty()

      /* search_key is defined */
      if (search_key != undefined) {
        // start loading data
        $('#loading_spinner_results').removeClass('hidden')
        parsed_search_result = {}
        parsed_search_result['diseases'] = {}
        parsed_search_result['key'] = undefined

        // check if key is ENSG number
        if (search_key.startsWith('ENSG')) {
          if(!$('#options_mirna').hasClass('hidden')){
            $('#options_mirna').addClass('hidden')
          }
          $('#options_gene').removeClass('hidden')
          $('#gene_search_keys').val(search_key)
          controller.get_ceRNA_interactions_all({
            ensg_number: [search_key],
            limit: limit,
            callback: (response) => {
              parse_cerna_response(response)
              // end loading 
              $('#loading_spinner_results').addClass('hidden')
            },
            error: (response) => {
              helper.msg("Something went wrong finding your ENSG number.", true)
              $('#loading_spinner_results').addClass('hidden')
            }
          })
        } else if (search_key.startsWith('MIMAT')) {
          if(!$('#options_gene').hasClass('hidden')){
            $('#options_gene').addClass('hidden')
          }
          // key is MIMAT number
          $('#options_mirna').removeClass('hidden')
          $('#mirna_search_keys').val(search_key)
          controller.get_miRNA_interactions_all({
            limit: limit,
            mimat_number: [search_key],
            callback: (response) => {
              parse_mirna_response(response)
              // end loading
              $('#loading_spinner_results').addClass('hidden')
            },
            error: (response) => {
              helper.msg("Something went wrong finding your MIMAT number.", true)
              $('#loading_spinner_results').addClass('hidden')
            }
          })
        } else if (search_key.startsWith('hsa-')) {
          if(!$('#options_gene').hasClass('hidden')){
            $('#options_gene').addClass('hidden')
          }
          // key is hsa number
          $('#options_mirna').removeClass('hidden')
          $('#mirna_search_keys').val(search_key)
          controller.get_miRNA_interactions_all({
            limit: limit,
            hs_number: [search_key],
            callback: (response) => {
              parse_mirna_response(response)
              // end loading
              $('#loading_spinner_results').addClass('hidden')
            },
            error: (response) => {
              helper.msg("Something went wrong finding your hsa number.", true)
              $('#loading_spinner_results').addClass('hidden')
            }
          })
        } else {
          if(!$('#options_mirna').hasClass('hidden')){
            $('#options_mirna').addClass('hidden')
          }
          // key is gene symbol
          $('#options_gene').removeClass('hidden')
          $('#gene_search_keys').val(search_key)
          controller.get_ceRNA_interactions_all({
            gene_symbol: [search_key],
            limit: limit,
            callback: (response) => {
              parse_cerna_response(response)
              // end loading
              $('#loading_spinner_results').addClass('hidden')
            },
            error: (response) => {
              helper.msg("Something went wrong finding your gene symbol.", true)
              $('#loading_spinner_results').addClass('hidden')
            }
          })
        }
      }
    }

   

    function parse_mirna_response(response) {
      // get information aboout search key
      let key_information = response[0]['mirna']
      let key_information_sentence = "Results for " + key_information['mir_ID'] + " (" + key_information['hs_nr'] + ")"
      $('#key_information').html(key_information_sentence)
      // parse response
      response.forEach(interaction => {
        let row = {}
        let gene_gene = interaction['interactions_genegene']
        row['Gene1'] = gene_gene['gene1']['ensg_number']
        row['Gene1 Symbol'] = gene_gene['gene1']['gene_symbol']
        row['Gene2'] = gene_gene['gene2']['ensg_number']
        row['Gene2 Symbol'] = gene_gene['gene2']['gene_symbol']
        let disease = gene_gene['run']['dataset']
        if (disease in parsed_search_result['diseases']) {
          parsed_search_result['diseases'][disease].push(row)
        } else {
          parsed_search_result['diseases'][disease] = [row]
        }
      })

      // build html for response_data
      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('')
        let table_id: string = disease_trimmed + "-table"
        let accordion_card = "<div class='card'>" +
          "<div class='card-header' id='heading_" + disease_trimmed + "'>" +
          "<h5 class='mb-0'>" +
          "<button class='btn btn-link collapsed' data-toggle='collapse' data-target='#collapse_" + disease_trimmed + "' aria-expanded='false' aria-controls='collapse_" + disease_trimmed + "'>" +
          disease +
          "</button>" +
          "</h5>" +
          "</div>" +
          "<div id='collapse_" + disease_trimmed + "' class='collapse' aria-labelledby='headingOne' data-parent='#disease_accordion'>" +
          "<div class='card-body'>" +
          "<div class='card-body-table'></div>" +
          "</div>" +
          "</div>"
        $('#disease_accordion').append(accordion_card)

        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease],
          table_id,
          Object.keys(parsed_search_result['diseases'][disease][0])
        )
        $('#collapse_' + disease_trimmed).find('.card-body-table').html(html_table)

        var table = $("#" + table_id).DataTable({
          orderCellsTop: true,
        })
        helper.colSearch(table_id, table)

        // make rows selectable
        $('#' + table_id + ' tbody').on('click', 'tr', function () {
          $(this).toggleClass('selected');
          $(this).css("background-color",helper.select_color)
        })
      }
    }

    function push_interaction_filters(table_id: string) {
      $.fn.dataTable.ext.search.push(
        // filter for mscor
        function (settings, data, dataIndex) {
          if (settings.nTable.id !== table_id) {
            return true;
          }
          var mscore_min = parseFloat($('#mscore_min_' + table_id).val().toString());
          var mscore_max = parseFloat($('#mscore_max_' + table_id).val().toString());
          var mscore = parseFloat(data[5]) || 0; // use data for the mscor column
          if ((isNaN(mscore_min) && isNaN(mscore_max)) ||
            (isNaN(mscore_min) && mscore <= mscore_max) ||
            (mscore_min <= mscore && isNaN(mscore_max)) ||
            (mscore_min <= mscore && mscore <= mscore_max)) {
            return true;
          }
          return false;
        },
        //  filter for pvalue
        function (settings, data, dataIndex) {
          if (settings.nTable.id !== table_id) {
            return true;
          }
          var pvalue_min = parseFloat($('#pvalue_min_' + table_id).val().toString());
          var pvalue_max = parseFloat($('#pvalue_max_' + table_id).val().toString());
          var pvalue = parseFloat(data[6]) || 0; // use data for the pvalue column
          if ((isNaN(pvalue_min) && isNaN(pvalue_max)) ||
            (isNaN(pvalue_min) && pvalue <= pvalue_max) ||
            (pvalue_min <= pvalue && isNaN(pvalue_max)) ||
            (pvalue_min <= pvalue && pvalue <= pvalue_max)) {
            return true;
          }
          return false;
        }
      );
    }

    function parse_node_data(data) {
      // let ensg_numbers = []
      let nodes = [];
      let node_options = ""   // for node selector
      for (let gene in data) {
        let id = data[gene]['ensg_number'];
        let label = data[gene]['gene_symbol'];
        if (label == '') {
          label = 'unknown'
        }
        let x = helper.getRandomInt(10);
        let y = helper.getRandomInt(10);
        let size = parseFloat(data[gene]['p-value']);
        let color = helper.default_node_color;
        nodes.push({id, label, x, y , size, color})

        node_options += "<option data-subtext="+label+">"+id+"</option>"
      }
      // append options to search-dropdown for network
      $('#network_search_node').html(node_options)
      $('#network_search_node').selectpicker()

      // save data for later search
      let ordered_data = [];
      // let ensg_numbers = []
      for (let i=0; i < Object.keys(data).length; i++) {
        let entry = data[i]
        // change order of columns alredy in object
        let ordered_entry = {}
        // flatten data object
        for (let x in entry['gene']) {
          entry[x] = entry['gene'][x]
        }
        // ensg_numbers.push(entry['ensg_number'])
        ordered_entry['ENSG Number'] = entry['ensg_number']
        ordered_entry['Gene Symbol'] = entry['gene_symbol']
        ordered_entry['Betweeness'] = entry['betweeness']
        ordered_entry['Eigenvector'] = entry['eigenvector']
        ordered_entry['Node Degree'] = entry['node_degree']
        ordered_entry['Gene ID'] = entry['gene_ID']
        ordered_entry['Netowrk Analysis ID'] = entry['network_analysis_ID']
        ordered_data.push(ordered_entry)
      }
      $('#node_data').text(JSON.stringify(ordered_data))

      /* plot expression data for nodes */
      //helper.expression_heatmap_genes(disease_trimmed, ensg_numbers, 'expression_heatmap')
      return nodes
    }

    function load_edges(disease, nodes, callback?) {
      controller.get_ceRNA_interactions_specific({'disease_name':disease, 'ensg_number':nodes,
        'callback':data => {
          let edges = [];
          let edge_options = ""   // for network search selector
          for (let interaction in data) {
            let id = data[interaction]['interactions_genegene_ID'];
            let source = data[interaction]['gene1'];
            let target = data[interaction]['gene2'];
            let size = 100*data[interaction]['mscor'];
            let color = helper.default_edge_color;
            //let type = 'line'//, curve
            edges.push({
              id: id, 
              source: source, 
              target: target, 
              size: size, 
              color: color, 
            })
            edge_options += "<option data-subtext="+source+","+target+">"+id+"</option>"
          }
          // append options to search-dropdown for network
          $('#network_search_node').append(edge_options)

          let ordered_data = []
          for (let i=0; i < Object.keys(data).length; i++) {
            let entry = data[i]
            // change order of columns alredy in object
            let ordered_entry = {}
            ordered_entry['Gene 1'] = entry['gene1']
            ordered_entry['Gene 2'] = entry['gene2']
            ordered_entry['Correlation'] = entry['correlation']
            ordered_entry['MScor'] = entry['mscor']
            ordered_entry['p-value'] = entry['p_value']
            ordered_entry['interaction gene-gene ID'] = entry['interactions_genegene_ID']
            ordered_data.push(ordered_entry)
          }


          $('#edge_data').text(JSON.stringify(ordered_data))
          return callback(edges)
        },
        error: (response) => {
          console.log(response)
          helper.msg("Something went wrong while loading the interactions.", true)
        }
      })
    }

    function parse_cerna_response(response) {
      response.forEach(interaction => {
        let interaction_info = {};
        let gene_to_extract;
        let disease = interaction['run']['dataset']['disease_name']
        // parse the information
        let correlation = interaction['correlation']
        // usually get information for other gene, extract information for key gene only once
        if (interaction['gene1']['ensg_number'] == search_key || interaction['gene1']['gene_symbol'] == search_key) {
          // gene1 is search gene, gene2 is not 
          gene_to_extract = 'gene2'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene1']
          }
        } else {
          // gene1 is not search gene, gene2 is
          gene_to_extract = 'gene1'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene2']
          }
        }

        if (!(disease in parsed_search_result['diseases'])) {
          parsed_search_result['diseases'][disease] = []
        }

        interaction_info['ENSG Number'] = interaction[gene_to_extract]['ensg_number']
        interaction_info['Gene Symbol'] = interaction[gene_to_extract]['gene_symbol']
        interaction_info['Gene Type'] = interaction[gene_to_extract]['gene_type']
        interaction_info['Chromosome'] = interaction[gene_to_extract]['chromosome_name']
        interaction_info['Correlation'] = interaction['correlation']
        //interaction_info['gene'] = interaction[gene_to_extract]['gene_ID']
        interaction_info['MScor'] = interaction['mscor']
        interaction_info['p-value'] = interaction['p_value']

        parsed_search_result['diseases'][disease].push(interaction_info)

      }); // end for each

      // Set key-gene information
      let key_information = {
        gene: parsed_search_result['key']['ensg_number'],
        gene_symbol: parsed_search_result['key']['gene_symbol'],
        chromosome: parsed_search_result['key']['chromosome_name']
      }
      let key_information_sentence = "For gene " + key_information['gene']
      if (key_information['gene_symbol'] != '') {
        key_information_sentence += " (" + key_information['gene_symbol'] + ")"
      }
      key_information_sentence += " on chromosome " + key_information['chromosome']

      $('#key_information').html(key_information_sentence)

      // build table out of parsed result for each disease
      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('')
        let table_id: string = disease_trimmed + "-table"
        let accordion_card = "<div class='card'>" +
          "<div class='card-header' id='heading_" + disease_trimmed + "'>" +
          "  <h5 class='mb-0'>" +
          "<button class='btn btn-link collapsed' data-toggle='collapse' data-target='#collapse_" + disease_trimmed + "' aria-expanded='false' aria-controls='collapse_" + disease_trimmed + "'>" +
          disease +
          "</button>" +
          "</h5>" +
          "</div>" +
          "<div id='collapse_" + disease_trimmed + "' class='collapse' aria-labelledby='headingOne' data-parent='#disease_accordion'>" +
          "<div class='card-body'>" +
          "<div id=button_control_"+disease_trimmed+">"+
          "<button class='btn btn-secondary button-margin' type='button' data-toggle='collapse' data-target='#control_" + table_id + "' aria-expanded='false'>" +
          "Options" +
          "</button>" +
          "<button class='export_nodes btn btn-primary button-margin' value="+table_id+">Show as Network</button>"+
          "</div>"+
          "<div class='collapse' id='control_" + table_id + "' style='margin-bottom:20px;'>" +
          "<div class='card card-body' style='border-radius:10px; background-color: #004085; background:linear-gradient(45deg, #043056, #004085, #043056); color:white'>" +
          "<div>" +
          "<p>Set filter for mscor</p>" +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='mscore_min_" + table_id + "' name='mscore_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='mscore_max_" + table_id + "' name='mscore_max'>" +
          "</div>" +
          "<hr>" +
          "<div>" +
          "<p>Set filter for P-value</p>" +
          "<span>Minimum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='pvalue_min_" + table_id + "' name='pvalue_min'>&nbsp;" +
          "<span>Maximum: </span><input type='text' style='border-radius:10px; margin-right: 50px;' id='pvalue_max_" + table_id + "' name='pvalue_max'>" +
          "</div>" +
          "</div>" +
          "</div>" +
          "<div class='card-body-table'></div>" +
          "</div>" +
          "</div>"
         
        $('#disease_accordion').append(accordion_card)

        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease],
          table_id,
          Object.keys(parsed_search_result['diseases'][disease][0])
        )
        $('#collapse_' + disease_trimmed).find('.card-body-table').html(html_table)

        push_interaction_filters(table_id)
        var table = $("#" + table_id).DataTable({
          orderCellsTop: true,
        })
        helper.colSearch(table_id, table)

        $('#mscore_min_' + table_id + ', #mscore_max_' + table_id + ', #pvalue_min_' + table_id + ', #pvalue_max_' + table_id).keyup(() => {
          table.draw()
        })
        // make rows selectable
        $('#' + table_id + ' tbody').on('click', 'tr', function () {
          $(this).toggleClass('selected');
          $(this).css("background-color",helper.select_color)
        })

        // BUTTON: load expression information for gene in this disease
        let config = {
          disease_name: disease.split(' ').join('%20'),
          callback: (response) => {
            // open raw expression data in new tab
            let json = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response));
            let buttons = $("#button_control_"+disease_trimmed)
            buttons.append($('<a href="data:' + json + '" download="expression_'+disease_trimmed+'.json" class="btn btn-secondary button-margin">Raw Expression Data</a>'))
          }
        };
        if (search_key.startsWith('ENSG')) {
          config['ensg_number'] = [key_information['gene']]
        } else {
          config['gene_symbol'] = [key_information['gene_symbol']]
        }
        controller.get_expression_ceRNA(config)

        $(".export_nodes").click( function() {
          let table = $('#'+$(this).val()).DataTable()
          let selected_nodes_data = table.rows('.selected', { filter : 'applied'}).data()
          if (selected_nodes_data.length === 0) {
            selected_nodes_data = table.rows({ filter : 'applied'}).data()
          }

          let params_genes_keys = ['ensg_number', 'gene_symbol', 'gene_type', 'chromosome', 'correlation', 'mscor', 'p-value']

          // parse values from search into correct format
          let gene
          let key
          let new_nodes = {}
          for (let entry in selected_nodes_data) {
            if (isNaN(entry as any)) {
              continue
            }
            gene = selected_nodes_data[entry]
            new_nodes[entry] = {}
            for (let i=0; i < params_genes_keys.length; i++) {
              key = params_genes_keys[i]
              new_nodes[entry][key] = gene[i]
            }
          }
          let nodes = parse_node_data(new_nodes)
          let ensg_numbers = nodes.map(function(node) {return node.id})
          load_edges(encodeURI(disease), ensg_numbers, edges => {
          
            let network = helper.make_network(disease_trimmed, nodes, edges)
            setTimeout(() => {
              // network.refresh()
              $('#restart_camera').click()
              network.refresh()
            }, 500)
            // load expression data
            //load_heatmap(this.disease_trimmed, ensg_numbers)

            if ($('#network').hasClass('hidden')) {
              $('#network').removeClass('hidden')
            }
          })

        })

      }
    }

    $(function() {  
      $( ".autocomplete" ).autocomplete({
        source: ( request, response ) => {
          controller.search_string({
            searchString: request.term,
            callback: (data) => {
              // put all values in a list
              let values = []
              for (let entry in data) {
                values.push(Object.values(data[entry])[0])
              }
              response(values)
            },
            error: () => {
              console.log(request)
            }
          })
        },
        minLength: 3,
        search: function() {
          $( this ).addClass( "loading" );
        },
        response: function() {
          $( this ).removeClass( "loading" );
        }
      });
    });


    $('#KMP-plot-container').append(KMP_test);

    function KMP_test() 
    {
      //einlesen der test daten für den KM Plot
      let json = require('/home/veronika/Dokumente/Sponge/Git/SPONGE-web-frontend/src/assets/img/survival-plot.json');
      var testSD = JSON.stringify(json);
      var wholeJason = JSON.parse(testSD);
      console.log(wholeJason[0].donors.length);

      var dn="kidney clear cell carcinoma";
      var test = ["ENSG00000259090"];
      
      
      let overexpression_0=[]
      let overexpression_1=[]
      let mean_se =[]
      let overexpression_0_se =[]
      let overexpression_1_se =[]
      let seen_time_mean=[]
      let seen_time_0=[]
      let seen_time_1=[]


      controller.get_survival_rates({
        disease_name: dn,
        ensg_number: test,
        
        callback: (response) => {
          
        mean_se= parse_survival_data(response,seen_time_mean);
        
         for (let j=0; j < response.length; j++) { 
          
            if(response[j].overexpression == 0){
              overexpression_0.push(response[j]);
            }else{
              overexpression_1.push(response[j]);
            }
        }
        console.log('1 '+overexpression_1.length)
        console.log('0 '+overexpression_0.length)
        overexpression_1_se = parse_survival_data(overexpression_1,seen_time_1);
        overexpression_0_se = parse_survival_data(overexpression_0, seen_time_0);

        plot_KMP(mean_se,overexpression_0_se,overexpression_1_se,seen_time_mean, seen_time_1,seen_time_0, response[0].gene)
         // end loading
       //   $('#loading_spinner_results').addClass('hidden')
     
        },
        error: (response2) => {
         //helper.msg("Something went wrong finding your gene symbol.", true)
          //$('#loading_spinner_results').addClass('hidden')
        }
      });
    }
      //1. mit /survivalAnalysis/getRates das gen anhängen aus dem json die survival rate id holen und damit
      // für jdn eintrag /survivalAnalysis/sampleInformation holenund dann die konfidenz intervalle u log rank plot
      // außerdem zusätzlicher knopf um gen auszu wählen u dafür plots zu machen

      //Funktion noch mal für overexpression:0 und overexpression:1 
      function parse_survival_data(response,seen_time)
      {
        let samples = [];
        
        

        var allResp=JSON.stringify(response);
        var allResp2 = JSON.parse(allResp);
        console.log(allResp2.patient_information); //array mit den einträgen
        
          
         
          for (let i=0; i < allResp2.length; i++) {  //rausziehen der patienten info
             //Gleich berechnen des SE u speichern des ergebnisses in array mit sample id u (gene)//
             //Dafür abspeichern des JSon in seperaten array damit man eins zum durchsuchen hat und eins zum abarbeiten
            samples.push(allResp2[i]);
            
          }
          //Sortieren nach der survival time
          samples.sort((a,b) => (a.patient_information.survival_time > b.patient_information.survival_time) ? 1: -1);
          console.log(samples[0].patient_information)
          console.log(samples[1].patient_information)
          console.log(samples[2].patient_information)
          console.log(samples[3].patient_information)
          //TO-DO sicherstellen das 1 zeit auch nur 1 mal durchgegangen wird
          let SE_array=[]
         // let seen_time =[]
          let last_estimate=1;
          for (let i=0; i < samples.length; i++) 
          {
            if(samples[i].patient_information.survival_time != null && !seen_time.includes(samples[i].patient_information.survival_time))
            {
              let time = samples[i].patient_information.survival_time; 
              seen_time.push(time);
            //  seen_time_input.push(time);
              
              //alle einträge mit der time raus holen
              let censored_0=[];
              let censored_1=[];
              let count_time=0;
              let bigger_equal_time=0;
              //Durchsuchen von samples nach der zeit u zählen wie viele 0 und 1 wobei 0 ein event ist also tod
              for (let j=0; j < samples.length; j++) { 
                if(samples[j].patient_information.survival_time == time){
                  if(samples[j].patient_information.disease_status == 0){
                    censored_0.push(samples[j]);
                  }else{
                    censored_1.push(samples[j]);
                  }
                  count_time++; //wie viele insgesamt mit der time gibt es
                }
                if(samples[j].patient_information.survival_time >= time){
                bigger_equal_time +=1
                }
              }
                
                let n = censored_0.length; //hier ist ein tod eingetreten 
                let vorherSE=1; // alle SE die bis zu einen Event passiert sind für die Multiplikation 
              //  if(SE_array.length>0){
              /// for(let v=0; v< SE_array.length;v++){
                // vorherSE *= SE_array[v];
              // }
             // }


              // var estimate = vorherSE*(1-(n/bigger_equal_time)); //geteilt durch alle größer gleich der aktuellen zeit
            
              var estimate = last_estimate*(1-(n/bigger_equal_time));
              last_estimate = estimate;

                SE_array.push(estimate);
            
             //   console.log(SE_array[SE_array.length]+" "+time+" "+estimate+" "+vorherSE)

              
              
              //  console.log(modified_JSON);
             }
           }

       return SE_array;
     }

     function plot_KMP(mean_se,overexpression_0_se ,overexpression_1_se,seen_time_mean,seen_time_1,seen_time_0,gene_name ) 
     {       
       
        console.log(mean_se.length); //495
        var ensg = 'Survival Analysis of gene ' + gene_name
      
        
        var sestimateGesamt = [];
    
    
        console.log(seen_time_mean);
        console.log(sestimateGesamt[0]);
      
        //Holen der wichtigen Daten und berechnen der Werte + speichern in trace
        //Im beispiel fall nur y estimate gegen time x
        var mean = {
          x: seen_time_mean, 
          y: mean_se, 
          type: 'scatter',
          name: 'Normal SE calculations'

        };
        
        var overexpression_0 = {
          x: seen_time_0, 
          y: overexpression_0_se, 
          type: 'scatter',
          name: 'Underexpressed Genes'
        };

        var overexpression_1= {
          x: seen_time_1, 
          y: overexpression_1_se, 
          type: 'scatter',
          name: 'Overexpressed Genes'
        };

        var data = [mean,overexpression_0,overexpression_1];
        var layout = {
          title: {
            text:ensg ,
            font: {
              family: 'Courier New, monospace',
              size: 12,
            }
          },
          xaxis: {
            
            
            title: 'Duration(days)',
            autorange: true
          }, 
          yaxis: {
            title: 'Survival Rate',
            autorange: true
            
          }
        };
        Plotly.plot('myDiv', data, layout, {showSendToCloud: true});
     };
    
  }

  
  
}
