import { Helper } from '../app/helper';

import * as $ from "jquery";

export class Session {
    network;
    url = null

    constructor(network) {
        this.network = network
        // BROWSE
        $('#load_disease, #export_selected_nodes, #export_selected_edges').click( () => {
            // TODO maybe timeout until nodes are marked?
            this.update_url()
        })

        // SEARCH
        $('#options_gene_go').click( () => {
          this.update_url()
        })

        // ALL
        $('#network-plot-container').dblclick( () => {
          this.update_url()
        })
    }

    helper = new Helper()

    public init() {
      console.log("here")
    }

    public update_url() {
        // BROWSE
        let cancer:string = $('#disease_selectpicker').val().toString();
        let selected = this.get_selected()

        let url_params = '?cancer='+encodeURIComponent(cancer)
        if (selected['edges'].length > 0) {
            url_params += '&edges=' + encodeURIComponent(selected['edges'].join())
        }
        if (selected['nodes'].length > 0) {
            url_params += '&nodes=' + encodeURIComponent(selected['nodes'].join())
        }
        /////////////////// BROWSE START
        // sorting value
        if ($('#run-info-select').val()) {
          url_params += '&sorting=' + encodeURIComponent($('#run-info-select').val().toString())
        } 

        // cutoff betweenness
        if ($('#input_cutoff_betweenness').val()) {
          url_params += '&c_bet=' + encodeURIComponent($('#input_cutoff_betweenness').val().toString())
        }

        // cutoff degree
        if ($('#input_cutoff_degree').val()) {
          url_params += '&c_deg=' + encodeURIComponent($('#input_cutoff_degree').val().toString())
        }

        // cutoff eigenvector
        if ($('#input_cutoff_eigenvector').val()) {
          url_params += '&c_eig=' + encodeURIComponent($('#input_cutoff_eigenvector').val().toString())
        }

        // limit
        if ($('#input_limit').val()) {
          url_params += '&limit=' + encodeURIComponent($('#input_limit').val().toString())
        }
        /////////////////// BROWSE END

        /////////////////// SEARCH START
        if ($('#gene_input_limit').val()) {
          url_params += '&limit=' + encodeURIComponent($('#gene_input_limit').val().toString())
        }
        if ($('#gene_search_keys').val()) {
          url_params += '&search_key=' + encodeURIComponent($('#gene_search_keys').val().toString())
        }
        /////////////////// SEARCH START

        let path = window.location.pathname

        window.history.pushState(null, '', path+url_params)
    }

    public get_selected() {
        let edges = []
        let nodes = []
        if (!(this.network == null)) {
          this.network.graph.edges().forEach(
            (ee) => {
              if (ee.color == this.helper.subgraph_edge_color) {
                edges.push(ee['id'])
              }
            })
          this.network.graph.nodes().forEach(
            (node) => {
              if (node.color == this.helper.subgraph_node_color) {
                nodes.push(node['id'])
              }
            }
          )
        }
        return {'edges': edges, 'nodes': nodes}
      }
  


}