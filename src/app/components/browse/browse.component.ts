import { Component, OnInit, ErrorHandler} from '@angular/core';
import { Controller } from "../../control";
import { Helper } from "../../helper";


import sigma from 'sigma';

// wtf you have to declare sigma after importing it
declare const sigma: any;
declare var Plotly: any;
declare var $;


@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.less']
})
export class BrowseComponent implements OnInit {

  disease_trimmed = ''
  selected_disease = ''

  constructor() { }

  ngOnInit() {

    var node_table
    var edge_table
    
    const controller = new Controller()
    const helper = new Helper()

    // first things first, define dimensions of network container
    $('#network-plot-container-parent').css('height', $('#network-plot-container').width())
    $(window).on('resize', function(){
      $('#network-plot-container-parent').css('height', $('#network-plot-container').width())
    })

    /* Datatable configurations */
    $.fn.dataTable.ext.search.push(
      // filter for mscor
      function( settings, data, dataIndex ) {
        if ( settings.nTable.id !== 'interactions-edges-table' ) {
          return true;
        }
        var mscor_min = parseFloat( $('#mscor_min').val());
        var mscor_max = parseFloat( $('#mscor_max').val());
        var mscor = parseFloat( data[3] ) || 0; // use data for the mscor column
        if (( isNaN( mscor_min ) && isNaN( mscor_max ) ) ||
              ( isNaN( mscor_min ) && mscor <= mscor_max ) ||
              ( mscor_min <= mscor && isNaN( mscor_max ) ) ||
              ( mscor_min <= mscor && mscor <= mscor_max ))
        {
            return true;
        }
        return false;  
      },
      //  filter for pvalue
      function( settings, data, dataIndex ) {
        if ( settings.nTable.id !== 'interactions-edges-table' ) {
          return true;
        }
        var pvalue_min = parseFloat( $('#pvalue_min').val());
        var pvalue_max = parseFloat( $('#pvalue_max').val());
        var pvalue = parseFloat( data[4] ) || 0; // use data for the pvalue column
        if (( isNaN( pvalue_min ) && isNaN( pvalue_max ) ) ||
          ( isNaN( pvalue_min ) && pvalue <= pvalue_max ) ||
          ( pvalue_min <= pvalue && isNaN( pvalue_max ) ) ||
          ( pvalue_min <= pvalue && pvalue <= pvalue_max ) )
          {
            return true;
          }
        return false;
        }
    );
    /* end of configurations */
    
    $('#selected_disease').on('click', function() {
      $('#v-pills-run_information-tab')[0].click();
    });


    $('#title-BG').change( () => {
      $('#load_disease').click();
    })

   if( document.querySelector('#disease_selectpicker')){
      $('#load_disease').click();
    }

    run_information()

    // trigger click on first disease in the beginning
    $('#load_disease').click()

    
    $("#v-pills-interactions-tab").on('click',function(){
      if($('#v-pills-run_information-tab').hasClass('active')){
        $('#v-pills-run_information-tab').removeClass('active')
      }
    })

    $("#v-pills-run_information-tab").on('click',function(){
      if($('#v-pills-interactions-tab').hasClass('active')){
        $('#v-pills-interactions-tab').removeClass('active')
        $('#v-pills-interactions-collapse').attr('aria-expanded', false);
        $('#service').removeClass('show')
       $('#v-pills-interactions-collapse').addClass('collapsed')
      }
    })

    $("#nav-edges-tab").on('click',function(){
      if($(this).hasClass('active')){
        $(this).removeClass('active')}
      if($('#nav-nodes-tab').hasClass('active')){
        $('#nav-nodes-tab').removeClass('active')
      }   
      if($('#nav-overview-tab').hasClass('active')){
        $('#nav-overview-tab').removeClass('active')
      }            
    })

    $("#nav-nodes-tab").on('click',function(){
      if($(this).hasClass('active')){
        $(this).removeClass('active')}
      if($('#nav-edges-tab').hasClass('active')){
        $('#nav-edges-tab').removeClass('active')
      }   
      if($('#nav-overview-tab').hasClass('active')){
        $('#nav-overview-tab').removeClass('active')
      }            
    })

    $("#nav-overview-tab").on('click',function(){
      if($(this).hasClass('active')){
      $(this).removeClass('active')}
      if($('#nav-edges-tab').hasClass('active')){
        $('#nav-edges-tab').removeClass('active')
      }   
      if($('#nav-nodes-tab').hasClass('active')){
        $('#nav-nodes-tab').removeClass('active')
      }            
    })

    function load_nodes(disease_trimmed, callback?) {
      let sort_by = $('#run-info-select').val().toLowerCase()
    
      if (sort_by=="none" || sort_by=="") {sort_by = undefined}
      let cutoff_betweenness = $('#input_cutoff_betweenness').val()
      let cutoff_degree = $('#input_cutoff_degree').val()
      let cutoff_eigenvector = $('#input_cutoff_eigenvector').val()
      let limit = $('#input_limit').val()
      let descending = true
      controller.get_ceRNA({
        'disease_name':disease_trimmed, 
        'sorting':sort_by, 
        'limit':limit, 
        'betweenness':cutoff_betweenness, 
        'degree': cutoff_degree, 
        'eigenvector': cutoff_eigenvector, 
        'descending': descending,
        'callback': data => {
          let nodes = parse_node_data(data)

          return callback(nodes)
          },
          error: (response) => {
            helper.msg("Something went wrong while loading the ceRNAs.", true)
          }
      })
    }

    
    function load_edges(disease_trimmed, nodes, callback?) {
      controller.get_ceRNA_interactions_specific({'disease_name':disease_trimmed, 'ensg_number':nodes,
        'callback':data => {
          // remove "run"
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

          let column_names = Object.keys(ordered_data[0]);
          $("#interactions-edges-table-container").append(helper.buildTable(ordered_data,'interactions-edges-table', column_names))
          // find index positions from columns to round
          var index_correlation = column_names.indexOf('Correlation');
          var index_mscor = column_names.indexOf('MScor');
          var index_p_value = column_names.indexOf('p-value');

          edge_table = $('#interactions-edges-table').DataTable({
            columnDefs: [
              { render: function ( ordered_data, type, row ) {
                      return ordered_data.toString().match(/\d+(\.\d{1,3})?/g)[0];
                       },
                  targets: [ index_correlation, index_mscor, index_p_value ] }
            ],
            dom: '<"top"Bf>rt<"bottom"lip>',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]]
          }); 
          $('#interactions-edges-table tbody').on( 'click', 'tr', function () {
            $(this).toggleClass('selected');
          } ); 
          $('#filter_edges :input').keyup( function() {
            edge_table.draw();
          } );
          // colsearch for table
          helper.colSearch('interactions-edges-table', edge_table)

          let edges = [];
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
            
          }

          $('#edge_data').text(JSON.stringify(ordered_data))
          return callback(edges)
        },
        error: (response) => {
          helper.msg("Something went wrong while loading the interactions.", true)
        }
      })
    }

    function run_information() {
      // ALL TS FOR TAB RUN INFORMATION
      // load all disease names from database and insert them into selector 
      let disease_selector = $('#disease_selectpicker');
      let selected_disease_result = $('#selector_disease_result');

      disease_selector.selectpicker()
      
      // takes care of button with link to download page
      // loads specific run information
      $('#load_disease').click(function() {
        // start loading
        disease_selector.attr('disabled',true)
        $('#browse_loading_spinner').removeClass('hidden')

        $("#interactions-nodes-table-container").html(''); //clear possible older tables
        $("#interactions-edges-table-container").html(''); //clear possible older tables
        $("#expression_heatmap").html(''); //clear possible older expression map

        this.selected_disease = disease_selector.val().toString();
        this.disease_trimmed = this.selected_disease.split(' ').join('%20');

        let download_url = disease_selector.find(":contains("+this.selected_disease+")").attr('data-value')
        let disease_data_link = $('#selector_diseases_link')
        if (download_url.startsWith('http')) {
          if (disease_data_link.hasClass('hidden')) {
            disease_data_link.removeClass('hidden')
            disease_data_link.find('button').removeClass('disabled')
          }
          disease_data_link.attr('href', download_url);
        } else {
          if (!disease_data_link.hasClass('hidden')) {
            disease_data_link.removeAttr('href')
            disease_data_link.addClass('hidden')
            disease_data_link.find('button').addClass('disabled')
          }
        }
        

        // get specific run information
        controller.get_dataset_information(this.disease_trimmed, 
          data => {
            selected_disease_result.html('')
            data = data[0]
            
            // header
            let header = data['dataset']['disease_name']
            delete data['dataset']
            
            
            let run_table = document.createElement("table")  
            let run_name = document.createElement("th")
            run_name.innerHTML = helper.uppercaseFirstLetter(header);
            
            run_name.setAttribute("style","text-decoration:underline")

            let table= document.createElement("tr")
            table.appendChild(run_name)
            

            let table_keys= document.createElement("td")
            let table_values= document.createElement("td")
            

            for (let key in data) {
              let value = data[key]
              if(value == null){
                value = 'Not defined'
              }
              
              var table_entry = document.createElement("tr")
              table_entry.innerHTML = helper.uppercaseFirstLetter( key)
              table_entry.setAttribute("style","margin-right:2px")
              
              table_keys.appendChild(table_entry)
              
              

              var table_entryV = document.createElement("tr")
              table_entryV.innerHTML = value
              table_entryV.setAttribute("style","margin-left:-5px")
              
              table_values.appendChild(table_entryV)
              
            }
           
            table_keys.setAttribute("style","position:relative; top:38px;padding-right:25px")
            table_values.setAttribute("style","position:relative;top: 38px")
            table.setAttribute("style","position:absolute;margin-bottom:20px")
            run_table.appendChild(table)
            run_table.appendChild(table_keys)
            run_table.appendChild(table_values)
            selected_disease_result.append(run_table)
           
          }
        )

        /* Construct sigma js network plot and expression plot*/
        // load interaction data (edges), load network data (nodes)
       
        load_nodes(this.disease_trimmed, nodes => {
          let ensg_numbers = nodes.map(function(node) {return node.id})
          load_edges(this.disease_trimmed, ensg_numbers, edges => {
            
            let network = helper.make_network(this.disease_trimmed, nodes, edges)

            $('#export_selected_edges').click(() => {
              helper.clear_subgraphs(network);
              let selected_edges = edge_table.rows('.selected', { filter : 'applied'}).data()
              if (selected_edges.length === 0) {
                selected_edges = edge_table.rows({ filter : 'applied'}).data()
              }
              // find selected edges in graph and mark them
              network.graph.edges().forEach(
                (ee) => {
                  let edge_nodes = []
                  edge_nodes.push(ee['source'])
                  edge_nodes.push(ee['target'])
                  for(let i = 0; i < selected_edges.length; i++) {
                    let selected_edge = selected_edges[i]
                    // 0 and 1 are gene1 and gene2
                    if (edge_nodes.includes(selected_edge[0]) && edge_nodes.includes(selected_edge[1])){
                      ee.color = helper.subgraph_edge_color
                      break
                    } else {
                      ee.color = helper.default_edge_color
                    }
                  }
                }
              )
              // go to network
              $('[aria-controls=nav-overview]').click()
              setTimeout(() => {
                $('#restart_camera').click()
              }, 200)
            })
      
            $('#export_selected_nodes').click(() => {
              helper.clear_subgraphs(network);
              let selected_nodes = []
              let selected_nodes_data = node_table.rows('.selected', { filter : 'applied'}).data()
              if (selected_nodes_data.length === 0) {
                selected_nodes_data = node_table.rows({ filter : 'applied'}).data()
              }
              for(let i = 0; i < selected_nodes_data.length; i++) {
                // first row is ensg number
                selected_nodes.push(selected_nodes_data[i][0])
              }
              network.graph.nodes().forEach(
                (node) => {
                  if (selected_nodes.includes(node['id'])) {
                    node.color = helper.subgraph_node_color
                  }
                }
              )
              // go to network
              $('[aria-controls=nav-overview]').click()
              setTimeout(() => {
                // network.refresh()
                $('#restart_camera').click()
              }, 500)
            })

            // load expression data
            helper.load_heatmap(this.disease_trimmed, ensg_numbers)

            // stop loading
            disease_selector.attr('disabled',false)
            $('#browse_loading_spinner').addClass('hidden') 

          })
        })
      })
    }

    function parse_node_data(data) {
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
      let nodes = [];

      for (let gene in ordered_data) {
        let id = ordered_data[gene]['ENSG Number'];
        let label = ordered_data[gene]['Gene Symbol'];
        if (label == '') {
          label = 'unknown'
        }
        let x = helper.getRandomInt(10);
        let y = helper.getRandomInt(10);
        let size = ordered_data[gene]['Eigenvector'];
        let color = helper.default_node_color;
        nodes.push({id, label, x, y , size, color})
      }

      // build datatable
      let column_names = Object.keys(ordered_data[0]);

      // find index positions from columns to round
      var index_betweeness = column_names.indexOf('Betweeness');
      var index_eigenvector = column_names.indexOf('Eigenvector');
      $("#interactions-nodes-table-container").append(helper.buildTable(ordered_data,'interactions-nodes-table', column_names))
      node_table = $('#interactions-nodes-table').DataTable( {
        columnDefs: [
          { render: function ( ordered_data, type, row ) {
              return ordered_data.toString().match(/\d+(\.\d{1,3})?/g)[0];
            },
            targets: [index_betweeness, index_eigenvector] }
        ],
        dom: '<"top"Bf>rt<"bottom"lip>',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]]
      });
      // colsearch for table
      helper.colSearch('interactions-nodes-table', node_table)

      $('#interactions-nodes-table tbody').on( 'click', 'tr', function () {
        $(this).toggleClass('selected');
      } );
      // save data for later search
      $('#node_data').text(JSON.stringify(ordered_data))

      /* plot expression data for nodes */
      //helper.expression_heatmap_genes(disease_trimmed, ensg_numbers, 'expression_heatmap')
      return nodes
    }
  }
}