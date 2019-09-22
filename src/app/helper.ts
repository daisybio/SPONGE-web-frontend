import { Controller } from "../app/control";
import sigma from 'sigma';

// wtf you have to declare sigma after importing it
declare const sigma: any;
declare var Plotly: any;
declare var $: any;

export class Helper {

    constructor() {
    }

    default_node_color = '#FFFF00'
    default_edge_color = '#0000FF'
    subgraph_edge_color = '#FF6347'
    subgraph_node_color = '#920518'

    controller = new Controller()

    public buildTable(data, table_name, column_names) {
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

    public colSearch(datatable_id, table) {
      // setup for colsearch
      $('#'+datatable_id+' thead tr').clone(true).appendTo( '#'+datatable_id+' thead' )
      $('#'+datatable_id+' thead tr:eq(1) th').unbind()
      $('#'+datatable_id+' thead tr:eq(1) th').each( function (i) {
          var title = $(this).text();
          $(this).html( '<input type="text" placeholder="Search '+title+'" />' );
  
          $( 'input', this ).on( 'keyup change', function () {
              if ( table.column(i).search() !== this['value'] ) {
                  table
                      .column(i)
                      .search( this['value'])
                      .draw();
              }
          } );
      } );
    }

    public msg(msg, error=false) {
      let overlay;
      if (error) {
        overlay = $('#error_overlay')
        $('#error_overlay_msg').text(msg);
      } else {
        overlay = $('#msg_overlay')
        $('#msg_overlay_msg').text(msg);
      }
      overlay.modal('show')
      overlay.find('.close').unbind()
      overlay.find('.close').click( () => {
        overlay.modal('hide')
      })
    }

    public uppercaseFirstLetter(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    public getRandomInt(max) {
      return Math.floor(Math.random() * Math.floor(max));
    }

    public expression_heatmap_genes(disease_name, genes, node_id) {
      /* genes is list of ensg-numbers 
      node id is html node to plot graph into */
      this.controller.get_expression_ceRNA({
        disease_name: disease_name,
        ensg_number: genes,
        callback: (response) => {
          console.log(response) 
          // flatten response
          var z = []
          var x = []
          var y = []
          var seen_genes = []
          var seen_exp_ids = []
          response.forEach( gene_object => {
            console.log(gene_object)
            let gene = gene_object['gene']
            let expr_value = gene_object['exp_value']
            let expr_ID = gene_object['expr_ID']
            if (!(expr_ID in seen_exp_ids)) {
              seen_exp_ids.push(expr_ID)
            } else {
              console.log(expr_ID)
            }
          })
          console.log(seen_exp_ids)
          var data = [
            {
              z: [[1, 20, 30, 50, 1], [20, 1, 60, 80, 30], [30, 60, 1, -10, 20]],
              x: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              y: ['Morning', 'Afternoon', 'Evening'],
              type: 'heatmap'
            }
          ];
          
          Plotly.newPlot(node_id, data);
      
        }
      })
    }


    public make_network(selected_disease, nodes, edges) {

      console.log(selected_disease)
      console.log(nodes)
      console.log(edges)

      const $this = this

      let graph = {
        nodes: nodes,
        edges: edges
      }
      let network = new sigma({
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
            defaultNodeColor: this.default_node_color,
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
            if ($('#node_information').hasClass('hidden')) {
              $('#node_information').removeClass('hidden')
            }
            // hide edge information
            if (!$('#edge_information').hasClass('hidden')) {
              $('#edge_information').addClass('hidden')
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
            if ($('#edge_information').hasClass('hidden')) {
              $('#edge_information').removeClass('hidden')
            }
            // hide edge information
            if (!$('#node_information').hasClass('hidden')) {
              $('#node_information').addClass('hidden')
            }
            break
          }
        }
      })

      network.bind('doubleClickNode', (e) => {
        node_click_function(e)
      })

      function node_click_function(e) {
          var nodeId = e.data.node.id;
          let color_all = false;
          network.graph.adjacentEdges(nodeId).forEach(
            (ee) => {
              if (ee.color !== $this.subgraph_edge_color){
                color_all = true
              }
            }
          )
          if (color_all) {
            network.graph.adjacentEdges(nodeId).forEach( (ee) => {
              ee.color = $this.subgraph_edge_color
            })
            // set node color to clicked
            e.data.node.color = $this.subgraph_node_color
          } else {
            network.graph.adjacentEdges(nodeId).forEach( (ee) => {
              ee.color = $this.default_edge_color
            })
            // set node color to default
            e.data.node.color = $this.default_node_color
          }
          network.refresh();
      }

      function searchNode(node_to_search) {
        let error_field = $('#network_search_node_error')
        var nodes = network.graph.nodes()
        let found = false
        for (let node in nodes) {
          if (nodes[node]['id'] == node_to_search || nodes[node]['label'] == node_to_search) {
            focusNode(network.cameras[0], nodes[node])
            nodes[node].color = $this.subgraph_node_color
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
            focusEdge(network.cameras[0], edges[edge])
            edges[edge].color = $this.subgraph_edge_color
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

      function focusEdge(camera, edge) {
        sigma.misc.animation.camera(
          camera,
          {
            x: edge['read_cam0:x'],
            y: edge['read_cam0:y'],
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
          filename: 'SPONGE_'+selected_disease+'_graph.png',
          labels: true,
          download: true,
        });
      })

      $('#network_snapshot_jpg').on('click', () => {
        network.renderers[0].snapshot({
          format: 'jpg', 
          background: 'white', 
          filename: 'SPONGE_'+selected_disease+'_graph.jpg',
          labels: true,
          download: true,
        });
      })

      $('#network_snapshot_svg').on('click', () => {
        network.toSVG({
          download: true, 
          filename: 'SPONGE_'+selected_disease+'_graph.svg',
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
        this.clear_subgraphs(network);
      })

      // Initialize the dragNodes plugin:
      var dragListener = sigma.plugins.dragNodes(network, network.renderers[0]);

      // network search selector
      $('#network_search_node').selectpicker()

      // zoom out 
      $('#restart_camera').click()

      return network
    }

    public clear_subgraphs(network) {
      network.graph.edges().forEach(
        (ee) => {
          ee.color = this.default_edge_color
        })
      network.graph.nodes().forEach(
        (node) => {
          node.color = this.default_node_color
        }
      )
      network.refresh()
    }

}