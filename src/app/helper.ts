import * as $ from "jquery";

export class Helper {

    constructor() {
    }

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
}