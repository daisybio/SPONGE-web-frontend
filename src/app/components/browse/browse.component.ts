import { Component, OnInit, ErrorHandler} from '@angular/core';
import { Controller } from "../../control";
import { Helper } from "../../helper";

import sigma from 'sigma';
import { CATCH_ERROR_VAR } from '@angular/compiler/src/output/output_ast';

// wtf you have to declare sigma after importing it
declare const sigma: any;

declare var $;
// dirty solution 
declare var require: any


@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.less']
})
export class BrowseComponent implements OnInit {
  disease_trimmed = ''
  selected_disease = ''

  constructor() {
   }

  ngOnInit() {
    
    const default_node_color = '#FFFF00'
    const default_edge_color = '#0000FF'
    const subgraph_edge_color = '#FF6347'
    const subgraph_node_color = '#920518'

    const node_information = $('#node_information')
    const edge_information = $('#edge_information')

    var node_table
    var edge_table
    var network
    
    const controller = new Controller()
    const helper = new Helper()

    /* Sigma configurations */
    sigma.classes.graph.addMethod('adjacentEdges', function(id) {
      if (typeof id !== 'string')
        throw 'adjacentEdges: the node id must be a string.';
      var a = this.allNeighborsIndex[id],
          eid,
          target,
          edges = [];
      for(target in a) {
        for(eid in a[target]) {
          edges.push(a[target][eid]);
        }
      }
      return edges;
    });

    /* Datatable configurations */
    $.fn.dataTable.ext.search.push(
      // filter for mscor
      function( settings, data, dataIndex ) {
        if ( settings.nTable.id !== 'interactions-edges-table' ) {
          return true;
        }
        var mscore_min = parseFloat( $('#mscore_min').val());
        var mscore_max = parseFloat( $('#mscore_max').val());
        var mscore = parseFloat( data[3] ) || 0; // use data for the mscore column
        if (( isNaN( mscore_min ) && isNaN( mscore_max ) ) ||
              ( isNaN( mscore_min ) && mscore <= mscore_max ) ||
              ( mscore_min <= mscore && isNaN( mscore_max ) ) ||
              ( mscore_min <= mscore && mscore <= mscore_max ))
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


    $('#disease_selectpicker').change( () => {
      $('#load_disease').click();
    })


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


    function getRandomInt(max) {
      return Math.floor(Math.random() * Math.floor(max));
    }

    function load_nodes(disease_trimmed, callback?) {
      let sort_by = $('#run-info-select').val().toLowerCase()
      if (sort_by=="none" || sort_by=="") {sort_by = undefined}
      let cutoff_betweenness = $('#input_cutoff_betweenness').val()
      let cutoff_degree = $('#input_cutoff_degree').val()
      let cutoff_eigenvector = $('#input_cutoff_eigenvector').val()
      let limit = $('#input_limit').val()
      let descending = true
      controller.get_ceRNA({'disease_name':disease_trimmed, 'sorting':sort_by, 'limit':limit, 'betweenness':cutoff_betweenness, 'degree': cutoff_degree, 'eigenvector': cutoff_eigenvector, 'descending': descending,
      'callback': data => {
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
          let node_options = ""   // for node selector
          for (let gene in ordered_data) {
            let id = ordered_data[gene]['ENSG Number'];
            let label = ordered_data[gene]['Gene Symbol'];
            if (label == '') {
              label = 'unknown'
            }
            let x = getRandomInt(10);
            let y = getRandomInt(10);
            let size = ordered_data[gene]['Eigenvector'];
            let color = default_node_color;
            nodes.push({id, label, x, y , size, color})

            node_options += "<option data-subtext="+label+">"+id+"</option>"
          }
          // append options to search-dropdown for network
          $('#network_search_node').html(node_options)
          // build datatable
          let column_names = Object.keys(ordered_data[0]);
          $("#interactions-nodes-table-container").append(helper.buildTable(ordered_data,'interactions-nodes-table', column_names))
          node_table = $('#interactions-nodes-table').DataTable( {
            columnDefs: [
              { render: function ( ordered_data, type, row ) {
                  return ordered_data.toString().match(/\d+(\.\d{1,3})?/g)[0];
                },
                targets: [2, 3] }
            ],
            lengthChange: false,
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ]
          });
          $('#interactions-nodes-table tbody').on( 'click', 'tr', function () {
            $(this).toggleClass('selected');
          } );
          // save data for later search
          $('#node_data').text(JSON.stringify(ordered_data))

          /* plot expression data for nodes */
          //helper.expression_heatmap_genes(disease_trimmed, ensg_numbers, 'expression_heatmap')

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
          edge_table = $('#interactions-edges-table').DataTable({
            columnDefs: [
              { render: function ( ordered_data, type, row ) {
                      return ordered_data.toString().match(/\d+(\.\d{1,3})?/g)[0];
                       },
                  targets: [ 2, 3, 4 ] }
            ],
            dom: 'Bfrtip',
            lengthChange: false,
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
          }); 
          $('#interactions-edges-table tbody').on( 'click', 'tr', function () {
            $(this).toggleClass('selected');
          } ); 
          $('#filter_edges :input').keyup( function() {
            edge_table.draw();
          } );
          let edges = [];
          let edge_options = ""   // for network search selector
          for (let interaction in ordered_data) {
            let id = data[interaction]['interactions_genegene_ID'];
            let source = data[interaction]['gene1'];
            let target = data[interaction]['gene2'];
            let size = 100*data[interaction]['mscore'];
            let color = default_edge_color;
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

        $("#interactions-nodes-table-container").html(''); //clear possible other tables
        $("#interactions-edges-table-container").html(''); //clear possible other tables
        $('#network-plot-container').html(''); // clear possible other network

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
            run_name.innerHTML = uppercaseFirstLetter(header);
            
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
              table_entry.innerHTML = uppercaseFirstLetter( key)
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
            let graph = {
              nodes: nodes,
              edges: edges
            }
            network = new sigma({
              graph: graph,
                renderer: {
                  container: document.getElementById('network-plot-container'),
                  type: 'canvas'
                },
                settings: {
                  minEdgeSize: 0.1,
                  maxEdgeSize: 2,
                  minNodeSize: 1,
                  maxNodeSize: 8,
                  defaultNodeColor: default_node_color,
                  autoRescale: ['nodePosition', 'nodeSize', 'edgeSize'],
                  animationsTime: 1000,
                  borderSize: 2,  
                  outerBorderSize: 3,
                  enableEdgeHovering: true,
                  edgeHoverColor: '#2ecc71',
                  defaultEdgeHoverColor: '#2ecc71',
                  edgeHoverSizeRatio: 2,
                  nodeHoverSizeRatio: 2,
                  edgeHoverExtremities: true,
                  scalingMode: 'outside',
                  doubleClickEnabled: false
                }
              }
            )

            var noverlap_config = {
              nodeMargin: 3.0,
              scaleNodes: 1.3
            };
            
            // Configure the algorithm
            var noverlap_listener = network.configNoverlap(noverlap_config);
            network.startNoverlap();

            network.addCamera('cam1')

            network.bind('overNode', (e) => {
              // events: overNode outNode clickNode doubleClickNode rightClickNode
              //console.log(e.type, e.data.node.label, e.data.captor, e.data);
              // load the node information for window on the side
              let data = JSON.parse($('#node_data').text())
              for (let entry in data) {
                if (data[entry]['ENSG Number'] == e.data.node.id && data[entry]['Gene Symbol'] == e.data.node.label) {
                  // build a table to display json
                  let table = "<table>"
                  for (let attribute in data[entry]) {
                    let row = "<tr>"
                    row += "<td>"+attribute+": </td>"
                    row += "<td>"+data[entry][attribute]+"</td>"
                    row += "</tr>"
                    table += row
                  }
                  table += "</table>"
                  $('#node_information_content').html(table)
                  // unhide node information 
                  if (node_information.hasClass('hidden')) {
                    node_information.removeClass('hidden')
                  }
                  // hide edge information
                  if (!edge_information.hasClass('hidden')) {
                    edge_information.addClass('hidden')
                  }
                  break
                }
              }
            });

            network.bind('overEdge', (e) => {
              let data = JSON.parse($('#edge_data').text())
              for (let entry in data) {
                if (data[entry]['interaction gene-gene ID'] == e.data.edge.id) {
                  // build a table to display json
                  let table = "<table>"
                  for (let attribute in data[entry]) {
                    let row = "<tr>"
                    row += "<td>"+attribute+": </td>"
                    row += "<td>"+data[entry][attribute]+"</td>"
                    row += "</tr>"
                    table += row
                  }
                  table += "</table>"
                  $('#edge_information_content').html(table)
                  // unhide node information 
                  if (edge_information.hasClass('hidden')) {
                    edge_information.removeClass('hidden')
                  }
                  // hide edge information
                  if (!node_information.hasClass('hidden')) {
                    node_information.addClass('hidden')
                  }
                  break
                }
              }
            })

            network.bind('doubleClickNode', (e) => {
              node_click_function(e)
            })

            function node_click_function(e) {
              {
                var nodeId = e.data.node.id;
                let color_all = false;
                network.graph.adjacentEdges(nodeId).forEach(
                  (ee) => {
                    if (ee.color !== subgraph_edge_color){
                      color_all = true
                    }
                  }
                )
                if (color_all) {
                  network.graph.adjacentEdges(nodeId).forEach( (ee) => {
                    ee.color = subgraph_edge_color
                  })
                  // set node color to clicked
                  e.data.node.color = subgraph_node_color
                } else {
                  network.graph.adjacentEdges(nodeId).forEach( (ee) => {
                    ee.color = default_edge_color
                  })
                  // set node color to default
                  e.data.node.color = default_node_color
                }
                network.refresh();
              };
            }

            function clear_subgraphs() {
              network.graph.edges().forEach(
                (ee) => {
                  ee.color = default_edge_color
                })
              network.graph.nodes().forEach(
                (node) => {
                  node.color = default_node_color
                }
              )
              network.refresh()
            }

            function searchNode(node_to_search) {
              let error_field = $('#network_search_node_error')
              var nodes = network.graph.nodes()
              let found = false
              for (let node in nodes) {
                if (nodes[node]['id'] == node_to_search || nodes[node]['label'] == node_to_search) {
                  focusNode(network.cameras[0], nodes[node])
                  nodes[node].color = subgraph_node_color
                  found = true
                  break
                }
              }
              if (!found) {
                // show error
                error_field.text('Could not find '+ node_to_search)
                if (error_field.hasClass('hidden')) {
                  error_field.removeClass('hidden')
                }
              } else {
                // remove error
                if (!error_field.hasClass('hidden')) {
                  error_field.addClass('hidden')
                }
              }
              // Filter or find the first matching node then apply focusNode on it
            }

            function searchEdge(edge_to_search) {
              var edges = network.graph.edges()
              for (let edge in edges) {
                if (edges[edge]['id'] == edge_to_search || edges[edge]['label'] == edge_to_search) {
                  focusNode(network.cameras[0], edges[edge])
                  edges[edge].color = subgraph_edge_color
                  break
                }
              }
            }


            function focusNode(camera, node) {
              sigma.misc.animation.camera(
                camera,
                {
                  x: node['read_cam0:x'],
                  y: node['read_cam0:y'],
                  ratio: 1
                },
                {
                  duration: 300
                }
              );
            }

            $('#network_search_node_button').click(() => {
              let to_search = $('#network_search_node').val()
              if (to_search.startsWith('ENSG')) {
                searchNode(to_search)
              } else {
                searchEdge(to_search)
              }
              
            })

            /* Save network button */
            $('#network_snapshot_png').on('click', () => {
              network.renderers[0].snapshot({
                format: 'png', 
                background: 'white', 
                filename: 'SPONGE_'+this.selected_disease+'_graph.png',
                labels: true,
                download: true,
              });
            })

            $('#network_snapshot_jpg').on('click', () => {
              network.renderers[0].snapshot({
                format: 'jpg', 
                background: 'white', 
                filename: 'SPONGE_'+this.selected_disease+'_graph.jpg',
                labels: true,
                download: true,
              });
            })

            $('#network_snapshot_svg').on('click', () => {
              network.toSVG({
                download: true, 
                filename: 'SPONGE_'+this.selected_disease+'_graph.svg',
                labels: true,
                size: 1000
              });
            })

            /* restart camera */
            document.getElementById('restart_camera').addEventListener('click', function() {
              network.camera.goTo({
                x: 0,
                y: 0,
                angle: 0,
                ratio: 2
              });
            });

            /* toggle force atlas 2 */
            $('#toggle_layout').unbind()
            $('#toggle_layout').click( () => {
              if ((network.supervisor || {}).running) {
                network.killForceAtlas2();
                document.getElementById('toggle_layout').innerHTML = 'Start layout';
              } else {
                network.startForceAtlas2({worker: true, slowDown: 100});
                document.getElementById('toggle_layout').innerHTML = 'Stop layout';
              }
            });      
            
            $('#reset_graph').click( () => {
              clear_subgraphs();
            })

            $('#export_selected_edges').click(() => {
              clear_subgraphs();
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
                      ee.color = subgraph_edge_color
                      break
                    } else {
                      ee.color = default_edge_color
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
              clear_subgraphs();
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
                    node.color = subgraph_node_color
                  }
                }
              )
              // go to network
              $('[aria-controls=nav-overview]').click()
              setTimeout(() => {
                $('#restart_camera').click()
              }, 500)
            })


            // Initialize the dragNodes plugin:
            var dragListener = sigma.plugins.dragNodes(network, network.renderers[0]);

            // network search selector
            $('#network_search_node').selectpicker()

            // stop loading
            disease_selector.attr('disabled',false)
            $('#browse_loading_spinner').addClass('hidden') 

            // zoom out 
            $('#restart_camera').click()

          })
        })
      })
      ;
      function uppercaseFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
        }
    }
  }
}
