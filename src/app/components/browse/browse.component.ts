import { Component, OnInit} from '@angular/core';
import { Controller } from "../../control";

//import 'datatables.net';
declare var $;
// very dirty solution 
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
    
    const default_node_color = '#920518'
    const default_edge_color = '#0000FF'
    const subgraph_edge_color = '#FF6347'
    const sigma = require('sigma'); 
      (<any>window).sigma = sigma; 
      // snapshot
      require('../../../../node_modules/sigma/build/plugins/sigma.renderers.snapshot.min.js'); 
      // drag nodes
      require('../../../../node_modules/sigma/build/plugins/sigma.plugins.dragNodes.min.js'); 
      // force atlas 2 (not working yet)
      require('../../../../node_modules/sigma/plugins/sigma.layout.forceAtlas2/supervisor.js');
      require('../../../../node_modules/sigma/plugins/sigma.layout.forceAtlas2/worker.js');
      // neighborhood
      require('../../../../node_modules/sigma/plugins/sigma.plugins.neighborhoods/sigma.plugins.neighborhoods.js') 

    var node_table
    var edge_table
    var network
    
    const controller = new Controller()

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
        var mscore = parseFloat( data[4] ) || 0; // use data for the mscore column
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
        var pvalue = parseFloat( data[5] ) || 0; // use data for the pvalue column
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
    
    $('#selected_disease').on('click', function() {
      $('#v-pills-run_information-tab')[0].click();
    });

    $('.selectpicker.diseases').change( () => {
      $('#load_disease').click();
    })

    $('#export_selected_edges').click(() => {
      let selected_edges = edge_table.rows('.selected').data()
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
      let data = node_table.rows('.selected').data()
      console.log(data)
    })

    run_information();

    function getRandomInt(max) {
      return Math.floor(Math.random() * Math.floor(max));
    }

    function buildTable(data, table_name, column_names) {
      var table = document.createElement("table");
      table.id=table_name;
      table.className="table table-striped full-width"
      var thead = document.createElement("thead");
      var tbody = document.createElement("tbody");
      var headRow = document.createElement("tr");
      column_names.forEach(function(el) {
        var th=document.createElement("th");
        th.appendChild(document.createTextNode(el));
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead); 
      data.forEach(function(el) {
        var tr = document.createElement("tr");
        for (var o in el) {  
          var td = document.createElement("td");
          td.appendChild(document.createTextNode(el[o]))
          tr.appendChild(td);
        }
        tbody.appendChild(tr);  
      });
      table.appendChild(tbody);             
      return table;
    }

    function load_nodes(disease_trimmed, callback?) {
      let sort_by = $('.selectpicker.sorting-value option:contains('+$('.selectpicker.sorting-value').val()+')').attr('data-value')
      let cutoff_betweenness = $('#input_cutoff_betweenness').val()
      let cutoff_degree = $('#input_cutoff_degree').val()
      let cutoff_eigenvector = $('#input_cutoff_eigenvector').val()
      let limit = $('#input_limit').val()
      controller.get_ceRNA({'disease_name':disease_trimmed, 'sorting':sort_by, 'limit':limit, 'betweenness':cutoff_betweenness, 'degree': cutoff_degree, 'eigenvector': cutoff_eigenvector,
      'callback': data => {
          let nodes = [];
          for (let gene in data) {
            // flatten data object
            for (let x in data[gene]['gene']) {
              data[gene][x] = data[gene]['gene'][x]
            }
            delete data[gene]['gene']
            delete data[gene]['run']// hide 'run'
            let id = data[gene]['ensg_number'];
            let label = data[gene]['gene_symbol'];
            if (label == '') {
              label = 'unknown'
            }
            let x = getRandomInt(10);
            let y = getRandomInt(10);
            let size = data[gene]['node_degree'];
            let color = default_node_color;
            nodes.push({id, label, x, y , size, color})
          }
        // build datatable
        let column_names = Object.keys(data[0]);
        $("#interactions-nodes-table-container").append(buildTable(data,'interactions-nodes-table', column_names))
        node_table = $('#interactions-nodes-table').DataTable( {
          columnDefs: [
            { render: function ( data, type, row ) {
                return data.toString().match(/\d+(\.\d{1,3})?/g)[0];
              },
              targets: [0, 1] }
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
        $('#node_data').text(JSON.stringify(data))

        return callback(nodes)
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
            ordered_entry['MScor'] = entry['mscore']
            ordered_entry['p-value'] = entry['p_value']
            ordered_entry['interaction gene-gene ID'] = entry['interactions_genegene_ID']
            ordered_data.push(ordered_entry)
          }
          let column_names = Object.keys(ordered_data[0]);
          $("#interactions-edges-table-container").append(buildTable(ordered_data,'interactions-edges-table', column_names))
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
          for (let interaction in ordered_data) {
            let id = data[interaction]['interactions_genegene_ID'];
            let source = data[interaction]['gene1'];
            let target = data[interaction]['gene2'];
            let size = 100*data['mscore'];
            let color = default_edge_color;
            //let type = line, curve
            edges.push({id, source, target, size, color})
          }
          return callback(edges)
        }
      })
    }

    function run_information() {
      // ALL TS FOR TAB RUN INFORMATION
      // load all disease names from database and insert them into selector 
      let disease_selector = $('.selectpicker.diseases');
      let selected_disease_result = $('#selector_disease_result');
      controller.get_datasets(
        data => {
          let i = 0
          for (let disease in data) {
            disease_selector.append(
              "<option data-value="+data[disease]['download_url']+">"+data[disease]['disease_name']+"</option>"
            )
            i++
          }
          // trigger click on first disease in the beginning
          $('#load_disease').click()
      })

      // takes care of button with link to download page
      // loads specific run information
      $('#load_disease').click(function() {
        $("#interactions-nodes-table-container").html(''); //clear possible other tables
        $("#interactions-edges-table-container").html(''); //clear possible other tables
        $('#network-plot-container').html(''); // clear possible other network

        this.selected_disease = disease_selector.val().toString();
        this.disease_trimmed = this.selected_disease.split(' ').join('%20');

        let download_url = disease_selector.find(":contains("+this.selected_disease+")").attr('data-value')
        let disease_data_link = $('#selector_diseases_link')
        if (download_url.startsWith('http')) {
          if (disease_data_link.hasClass('disabled')) {
            disease_data_link.removeClass('disabled')
            disease_data_link.find('button').removeClass('disabled')
          }
          disease_data_link.attr('href', download_url);
        } else {
          if (!disease_data_link.hasClass('disabled')) {
            disease_data_link.removeAttr('href')
            disease_data_link.addClass('disabled')
            disease_data_link.find('button').addClass('disabled')
          }
        }
        

        // get specific run information
        controller.get_dataset_information(this.disease_trimmed, 
          data => {
            selected_disease_result.html(JSON.stringify(data, undefined, 2));
          }
        )

        /* Construct sigma js network plot */
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
                  edgeHoverSizeRatio: 1,
                  edgeHoverExtremities: true,
                  scalingMode: 'outside' 
                }
              }
            )

            network.addCamera('cam1')

            network.bind('overNode', (e) => {
              // events: overNode outNode clickNode doubleClickNode rightClickNode
              //console.log(e.type, e.data.node.label, e.data.captor, e.data);
              // load the node information for window on the side
              let data = JSON.parse($('#node_data').text())
              for (let entry in data) {
                if (data[entry]['ensg_number'] == e.data.node.id && data[entry]['gene_symbol'] == e.data.node.label) {
                  $('#node_information').html(JSON.stringify(data[entry], undefined, 2))
                }
              }
            });

            network.bind('clickNode', (e) => {
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
                } else {
                  network.graph.adjacentEdges(nodeId).forEach( (ee) => {
                    ee.color = default_edge_color
                  })
                }
                network.refresh();
              };
            }

            function searchNode(node_to_search) {
              let error_field = $('#network_search_node_error')
              var nodes = network.graph.nodes()
              let found = false
              for (let node in nodes) {
                if (nodes[node]['id'] == node_to_search || nodes[node]['label'] == node_to_search) {
                  focusNode(network.cameras[0], nodes[node])
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
              let node_to_search = $('#network_search_node').val()
              searchNode(node_to_search)
            })

              /* Save network button */
              $('#network_snapshot').on('click', () => {
                network.renderers[0].snapshot({
                  format: 'png', 
                  background: 'white', 
                  filename: 'SPONGE_'+this.selected_disease+'_graph.png',
                  labels: true,
                  download: true,
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
              document.getElementById('toggle_layout').addEventListener('click', function() {
                if ((network.supervisor || {}).running) {
                  network.killForceAtlas2();
                  document.getElementById('toggle_layout').innerHTML = 'Start layout';
                } else {
                  network.startForceAtlas2({worker: true});
                  document.getElementById('toggle_layout').innerHTML = 'Stop layout';
                }
              });            


            // Initialize the dragNodes plugin:
            var dragListener = sigma.plugins.dragNodes(network, network.renderers[0]);
            // TODO: dragging also colors nodes
            /*
            dragListener.bind('drag',function(){
              setTimeout(function () {
                  network.unbind('clickNode');
              }, 100);
            });
            dragListener.bind('dragend',function(){
                setTimeout(function(){
                  network.bind('clickNode', node_click_function);
                }, 100)
            });*/

          })
        }) 
      })
      ;
    }
  }
}
