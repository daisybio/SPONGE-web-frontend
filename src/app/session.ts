import { Helper } from '../app/helper';

import * as $ from "jquery";

export class Session {
    network

    constructor(network) {
        this.network = network
        $('#load_disease').click( () => {
            this.update_url()
        })
        $('#network-plot-container').dblclick( () => {
            console.log("here")
            this.update_url()
        })
    }

    helper = new Helper()

    public init() {

    }

    public update_url() {
        let cancer:string = $('#disease_selectpicker').val().toString();
        let selected = this.get_selected()

        let url_params = '?cancer='+encodeURIComponent(cancer)
        if (selected['edges'].length > 0) {
            url_params += '&edges=' + encodeURIComponent(selected['edges'].join())
        }
        if (selected['nodes'].length > 0) {
            url_params += '&nodes=' + encodeURIComponent(selected['nodes'].join())
        }

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