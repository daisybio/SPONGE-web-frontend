import * as $ from "jquery";
import { Controller } from "../app/control";
declare var Plotly: any;

export class Helper {

    constructor() {
    }

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
}