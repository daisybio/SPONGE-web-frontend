import { Controller } from "../app/control";
import { Session } from "../app/session";
import sigma from 'sigma';
import { enableDebugTools } from '@angular/platform-browser';
import { listLazyRoutes } from '@angular/compiler/src/aot/lazy_routes';
import { ExpressionStatement } from '@angular/compiler';

// wtf you have to declare sigma after importing it
declare const sigma: any;
declare var Plotly: any;
declare var $: any;


export class Helper {

    constructor() {

      try {
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
      } catch {
        console.log("adjacent_edges exists")
      }

    }

    default_node_color = '#052444'
    default_edge_color = '#0000FF'
    subgraph_edge_color = '#FF6347'
    subgraph_node_color = '#920518'
    hover_edge_color =  '#228B22'
    hover_node_color = '#228B22'
    select_color= 'rgba(13, 73, 189, 0.67)'

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
            let gene = experiment['gene']['ensg_number']
            let expr_value = experiment['expr_value']
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
          console.log("seen sample ids ", seen_sample_ids)
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
          console.log(data)
          Plotly.newPlot('expression_heatmap', data, layout);
        },
        error: () => {
          this.msg("Something went wrong loading the expression data.", true)
        }
      })
    }

    public load_KMP(ensgList,clicked_Node,disease_name) 
    {
        // start loading data
        $('#loading_spinner_KMP').removeClass('hidden')
      //einlesen der test daten für den KM Plot
     // let json = require('/home/veronika/Dokumente/Sponge/Git/SPONGE-web-frontend/src/assets/img/survival-plot.json');
     // var testSD = JSON.stringify(json);
      //var wholeJason = JSON.parse(testSD);
      //console.log(wholeJason[0].donors.length);
      var dn=$('#disease_selectpicker').val().toString() 
      
      if(dn == "All"){
        dn = encodeURIComponent($('#network-plot-container').val().toString())
        }
     //console.log( $('#network-plot-container').val().toString()+" vorher"+ this.load_session_url['nodes'] )
     console.log( dn +" vorher"+ ensgList+" "+clicked_Node )

     
      var test = ensgList[0]//['ENSG00000179915'];
      
      //Rauslöschen des KMP-Plots wenn Node deselected wird
      if($('#myDiv_'+clicked_Node).length >0){
        console.log("gabs schon")
        $('#myDiv_'+clicked_Node).remove()
        $('#loading_spinner_KMP').addClass('hidden')
        
      }
      
    for(let $o=0; $o<ensgList.length;$o++){
     

     
      let overexpression_0=[]
      let overexpression_1=[]
      let mean_se =[]
      let overexpression_0_se =[]
      let overexpression_1_se =[]
      let seen_time_mean=[]
      let seen_time_0=[]
      let seen_time_1=[]
     
      if( $('#myDiv_'+ensgList[$o]).length <=0){
        this.controller.get_survival_rates({
          disease_name: dn,
          ensg_number: [ensgList[$o]],
          
          callback: (response) => {
            
          mean_se= this.parse_survival_data(response,seen_time_mean);
          
          for (let j=0; j < response.length; j++) { 
            
              if(response[j].overexpression == 0){
                overexpression_0.push(response[j]);
              }else{
                overexpression_1.push(response[j]);
              }
          }
         
          overexpression_1_se = this.parse_survival_data(overexpression_1,seen_time_1);
          overexpression_0_se = this.parse_survival_data(overexpression_0, seen_time_0);


          let add_KMP_Plot =  "<div class='col-auto' id='myDiv_"+response[0].gene +"'style='min-height:410px; min-width:510px; background-color:white; margin:10px; border: solid 3px #023f75; border-radius: 10px;'></div> "
      
          //          let add_KMP_Plot =  "<div class='col justify-content-md-center' id='kmp-plot-container' style='background-color:white;margin:10px; border: solid 3px #023f75; border-radius: 10px;'>"+"<div id='myDiv_"+response[0].gene +"'style='left:50%;'></div> "+"</div>"


          $('#plots').append(add_KMP_Plot)
          if(dn == encodeURIComponent($('#network-plot-container').val().toString())){
            dn = $('#network-plot-container').val().toString()
            }
          
          
          this.plot_KMP(mean_se,overexpression_0_se,overexpression_1_se,seen_time_mean, seen_time_1,seen_time_0, response[0].gene, dn)
     
    
          // end loading
           $('#loading_spinner_KMP').addClass('hidden')
      
          },
          error: (response2) => {
          this.msg("Something went wrong creating the survival analysis.", true)
          $('#loading_spinner_KMP').addClass('hidden')
          }
        
        });
      }
     }
     
    
    }
      //1. mit /survivalAnalysis/getRates das gen anhängen aus dem json die survival rate id holen und damit
      // für jdn eintrag /survivalAnalysis/sampleInformation holenund dann die konfidenz intervalle u log rank plot
      // außerdem zusätzlicher knopf um gen auszu wählen u dafür plots zu machen

      //Funktion noch mal für overexpression:0 und overexpression:1 
      parse_survival_data(response,seen_time)
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
             }
           }

       return SE_array;
     }

     plot_KMP(mean_se,overexpression_0_se ,overexpression_1_se,seen_time_mean,seen_time_1,seen_time_0,gene_name, disease_name ) 
     {       
       
        console.log(mean_se.length); //495
       // Plotly.purge('myDiv_'+gene_name); $('#network-plot-container').val().toString()
        var ensg = 'Survival Analysis of gene ' + gene_name + ' from cancer set <br>'+ disease_name
      
        
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

        var data = [overexpression_0,overexpression_1];
        var layout = {
         // autosize: false,
        //  width:480,
         // height: 400,
          legend:{
            orientation:"h",
            y: -0.35,
          },
          title: {
            text:ensg ,
            font: {
              family: 'Arial, bold',
              size: 12,
              color: '#052444',
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
        Plotly.plot('myDiv_'+gene_name ,data, layout, {showSendToCloud: true});
     };

    public make_network(selected_disease, nodes,  edges, node_table=null, edge_table=null) {

      const $this = this

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
      
      let session = new Session(network)

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
          if (data[entry]['ID'] == e.data.edge.id) {
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
        if($('#plots').hasClass('hidden')){
          $('#plots').removeClass('hidden') 
        }
      })

      function node_click_function(e) {
        /*
        marks clicked node + adjacent edges
        this function althers the network, hence triggers url update
        */
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

        // mark node in node_table
        if (node_table) {
          $this.mark_nodes_table(node_table, e.data.node.id)
        }
        // mark edges in edge_table
        if (edge_table) {
          let edges = network.graph.adjacentEdges(nodeId).map((ee) => String(ee.id))
          $this.mark_edges_table(edge_table, edges)
        }
        $this.node_is_clicked(nodeId)
        
        // network was altered, update url
        session.update_url()
        console.log("cancer set name "+encodeURIComponent(selected_disease)) 
        
        
        $this.load_KMP(session.get_selected()['nodes'],nodeId,selected_disease) 
      }


      function searchNode(node_as_string) {
        /*
        Searches for a given node-string "ENSG..." in the network and returns the node object
        */
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
        /*
        Searches for a given edge-id in the network and returns the edge object
        */
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
        /*
        This function is used to show one node in the network. 
        The camera moves to center the given node-string "ENSG..." and the node gets marked.
        Afterwards, the node gets also marked in the node_table.
        */
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
        // mark node in node table
        if (node_table) {
          $this.mark_nodes_table(node_table, node_as_string)
        }

      }

      function focusEdge(edge_as_string) {
        /*
        This function is used to show one edge in the network.
        The camera moves to center the given edge-string and the edge gets marked.
        Afterwards, the edge gets also marked in the edge_table.

        Returns network and corresponding session
        */
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
        // mark edge in edge table
        if (edge_table) {
          $this.mark_edges_table(edge_table, edge_as_string)
        }
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
        if (node_table) this.clear_table(node_table)  // no node table in search
        if (edge_table) this.clear_table(edge_table)  // no edge table in search
        session.update_url()
      })

      // Initialize the dragNodes plugin:
      var dragListener = sigma.plugins.dragNodes(network, network.renderers[0]);

      // zoom out 
      $('#restart_camera').click()

      network.refresh()
      return({'network': network, 'session': session})
    }

    nodeIDclicked:any = "test";
    public node_is_clicked(nodeID){
      this.nodeIDclicked= nodeID
      console.log(this.nodeIDclicked)
     } 
    public node_clicked(){
      return this.nodeIDclicked
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

    public clear_table(table) {
      table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
        if ($(this.node()).hasClass('selected')){
          $(this.node()).removeClass('selected')
        }
      });
    }

    public mark_nodes_table(table, nodes:string[]) {
      table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
        if (nodes.length && nodes.includes(this.data()[0])) {
          $(this.node()).addClass('selected')
        }
      });
    }

    public mark_edges_table(table, edges:string[]) {
      table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
        if (edges.length && edges.includes(this.data()[5])) {
          $(this.node()).addClass('selected')
        }
      });
    }

    public mark_nodes_network(network, nodes:string[]) {
      network.graph.nodes().forEach(
        (node) => {
          if (nodes.includes(node['id'])) {
            node.color = this.subgraph_node_color
          }
        }
      )
    }

    public mark_edges_network(network, edges:string[], based_on_id=false) {
      // find selected edges in graph and mark them
      if (based_on_id) {
        network.graph.edges().forEach(
          (ee) => {
            if (edges.includes(ee['id'].toString())){
              ee.color = this.subgraph_edge_color
            }
          }
        )
      } else {
        network.graph.edges().forEach(
          (ee) => {
            let edge_nodes = []
            edge_nodes.push(ee['source'])
            edge_nodes.push(ee['target'])
            for(let i = 0; i < edges.length; i++) {
              let selected_edge = edges[i]
              // 0 and 1 are gene1 and gene2
              if (edge_nodes.includes(selected_edge[0]) && edge_nodes.includes(selected_edge[1])){
                ee.color = this.subgraph_edge_color
                break
              } else {
                ee.color = this.default_edge_color
              }
            }
          }
        )
      }
    }

    public load_session_url(params) {
      let nodes = [], edges = [], active_cancer
      // set options 
      for (let key in params) {
        let val = params[key]
        switch (key) {
          case 'cancer': {
            $('#disease_selectpicker').val(val)
            break
          }
          case 'limit': {
            $('#input_limit').val(val)
            break
          } 
          case 'c_eig': {
            $('#input_cutoff_eigenvector').val(val)
            break
          } 
          case 'c_deg': {
            $('#input_cutoff_degree').val(val)
            break
          }
          case 'c_bet': {
            $('#input_cutoff_betweenness').val(val)
            break
          }
          case 'sorting': {
            $('#run-info-select').val(val)
            break
          }
          case 'nodes': {
            // store nodes to mark after loading plot
            nodes = val.split(',')
            break
          }
          case 'edges': {
            // store edges to mark after loading plot
            edges = val.split(',')
            break
          }
          case 'search_key': {
            $('#gene_search_keys').val(val)
            break
          }
          case 'active_cancer': {
            active_cancer = val
            break
          }
        }
      }
      return({'nodes': nodes, 'edges': edges, 'active_cancer': active_cancer})
    }

    
  
}