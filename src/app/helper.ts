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
    hover_edge_color = '#228B22'
    hover_node_color = '#228B22'

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

    public load_heatmap(disease, nodes) {
      this.controller.get_expression_ceRNA({
        disease_name: disease,
        ensg_number: nodes,
        callback: response => {
          var z = []
          var seen_sample_ids = {}
          let ordered_genes = nodes.sort()

          for (let e in response) {
            let experiment = response[e]
            let gene = experiment['gene']
            let expr_value = experiment['exp_value']
            let sample_ID = experiment['sample_ID']
            if (seen_sample_ids.hasOwnProperty(sample_ID)) {
              seen_sample_ids[sample_ID][gene] = expr_value
            } else {
              let new_obj = {}
              new_obj[gene] = expr_value
              seen_sample_ids[sample_ID] = new_obj
            }
          }

          // sort genes alphabetically
          ordered_genes.forEach((ensg_number) => {
            ordered_genes[ensg_number];
          });
          for(let sample_ID in seen_sample_ids) {
            let genes_values = seen_sample_ids[sample_ID]
            let l = []
            for (let j in Object.values(ordered_genes)) {
              let gene = ordered_genes[j]
              l.push(genes_values[gene])
            }
            z.push(l)
          }

          var data = [
            {
              z: z,
              y: Object.keys(seen_sample_ids),
              x: ordered_genes,
              type: 'heatmap'
            }
          ];

          var layout = {
            title: 'Expression Heatmap',
            annotations: [],
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            yaxis: {
              automargin: true,
              showticklabels: false,
              ticks: '',
            },
          };
          
          Plotly.newPlot('expression_heatmap', data, layout);
        },
        error: () => {
          this.msg("Something went wrong loading the expression data.", true)
        }
      })
    }


    public make_network(selected_disease, nodes, edges) {

      const $this = this

      /* Sigma configurations */
      if (typeof sigma.classes.graph.adjacentEdges === undefined) { 
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
      }

      $('#network-plot-container').html(''); // clear possible other network
      $('#network-search').html('');  // clear other search options

      $('#network-search').html(
        "<select id='network_search_node' class='form-control-md mr-sm-2' data-live-search='true' show-subtext='true'></select>"+
        "<button id='network_search_node_button' class='btn btn-sm btn-secondary' >Search</button>"
      )
      let node_options = ""   // for node selector
      for (let node in nodes) {
        let label = nodes[node]['label']
        let id = nodes[node]['id']
        node_options += "<option data-subtext="+label+">"+id+"</option>"
      }
      // append options to search-dropdown for network
      $('#network_search_node').append(node_options)

      let edge_options = ""   // for network search selector
      for (let edge in edges) {
        let source = edges[edge]['source']
        let target = edges[edge]['target']
        let id = edges[edge]['id']
        edge_options += "<option data-subtext="+source+","+target+">"+id+"</option>"
      }
      // append options to search-dropdown for network
      $('#network_search_node').append(edge_options)

      $('#network_search_node').selectpicker()

      let graph = {
        nodes: nodes,
        edges: edges
      }
      console.log(graph)
      let network = new sigma({
        graph: graph,
          renderer: {
            container: document.getElementById('network-plot-container'),
            type: 'canvas'
          },
          settings: {
            // minEdgeSize: 0.1,
            // maxEdgeSize: 2,
            // minNodeSize: 1,
            // maxNodeSize: 8,
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
        // e.data.node.color = $this.hover_node_color
        // load the node information for window on the side
        let data = JSON.parse($('#node_data').text())
        for (let entry in data) {
          if (data[entry]['ENSG Number'] == e.data.node.id && data[entry]['Gene Symbol'] == e.data.node.label) {
            // build a table to display json
            let table = "<table class='table table-striped table-hover'>"
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
        // e.data.edge.color = $this.hover_edge_color
        let data = JSON.parse($('#edge_data').text())
        for (let entry in data) {
          if (data[entry]['interaction gene-gene ID'] == e.data.edge.id) {
            // build a table to display json
            let table = "<table class='table table-striped table-hover'>"
            for (let attribute in data[entry]) {
              let row = "<tr>"
              row += "<td>"+attribute+": </td>"
              row += "<td>"+data[entry][attribute]+"</td>"
              row += "</tr>"
              table += row
            }
            table += "</table>"
            $('#edge_information_content').html(table)
            // unhide edge information 
            if ($('#edge_information').hasClass('hidden')) {
              $('#edge_information').removeClass('hidden')
            }
            // hide node information
            if (!$('#node_information').hasClass('hidden')) {
              $('#node_information').addClass('hidden')
            }
            break
          }
        }
      })

      // network.bind('outEdge', (ee) => { 
      //   ee.data.edge.color = $this.default_edge_color
      // })

      network.bind('doubleClickNode', (e) => {
        node_click_function(e)
      })

      function node_click_function(e) {
        var nodeId = e.data.node.id;
        let color_all = false;
        console.log(network)
        console.log(network.graph)
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

      function searchNode(node_as_string) {
        var nodes = network.graph.nodes()
        let node
        for (node in nodes) {
          if (nodes[node]['id'] == node_as_string || nodes[node]['label'] == node_as_string) {
            break
          }
        }
        return nodes[node]
      }

      function searchEdge(edge_as_string) {
        var edges = network.graph.edges()
        let edge
        for (edge in edges) {
          if (edges[edge]['id'] == edge_as_string || edges[edge]['label'] == edge_as_string) {
            break
          }
        }
        return edges[edge]
      }


      function focusNode(node_as_string) {
        let camera = network.cameras[0]
        let node = searchNode(node_as_string)
        node.color = $this.subgraph_node_color
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

      function focusEdge(edge_as_string) {
        let camera = network.cameras[0]
        let edge = searchEdge(edge_as_string)
        let source = searchNode(edge["source"])
        let target = searchNode(edge["target"])

        let x = (source['read_cam0:x'] + target['read_cam0:x']) / 2
        let y = (source['read_cam0:y'] + target['read_cam0:y']) / 2

        edge.color = $this.subgraph_edge_color
        sigma.misc.animation.camera(
          camera,
          {
            x: Number(x.toFixed()),
            y: Number(y.toFixed()),
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
          focusNode(to_search)
        } else {
          focusEdge(to_search)
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

      // zoom out 
      $('#restart_camera').click()

      network.refresh()
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