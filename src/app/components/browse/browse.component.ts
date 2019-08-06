import { Component, OnInit } from '@angular/core';
import * as $ from "jquery";
import 'datatables.net';
declare const sigma: any;

@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.less']
})
export class BrowseComponent implements OnInit {

  constructor() {
   }

  static API_ENDPOINT = "http://10.162.163.20:5000/sponge/";

  ngOnInit() {

    run_information();


    $('#selected_disease').on('click', function() {
      $('#v-pills-run_information-tab')[0].click();
    });

    function buildTable(data, table_name, column_names) {
      var table = document.createElement("table");
      table.className=table_name;
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




    function run_information() {
      // ALL TS FOR TAB RUN INFORMATION
      // load all disease names from database and insert them into selector 
      let disease_selector = $('.selectpicker.diseases');
      let selected_disease_result = $('#selector_disease_result');

      $.getJSON(BrowseComponent.API_ENDPOINT+"dataset",
      data => { 
        for (let disease in data) {
          disease_selector.append(
            "<option data-value="+data[disease]['download_url']+">"+data[disease]['disease_name']+"</option>"
          )
        }
      });
      // takes care of button with link to download page
      // loads specific run information
      disease_selector.change(function() {
        let selected_disease = $(this).val().toString();
        let disease_trimmed = selected_disease.split(' ').join('%20');
        $('#selected_disease').find('span').html(selected_disease);
        let download_url = $(this).find(":contains("+selected_disease+")").attr('data-value')
        $('#selector_diseases_link').attr('href', download_url);
        // get specific run information
        $.getJSON(BrowseComponent.API_ENDPOINT+"dataset/runInformation?disease_name="+disease_trimmed,
        data => {
          selected_disease_result.html(JSON.stringify(data, undefined, 2));
        })
        // load interaction data
        $.getJSON(BrowseComponent.API_ENDPOINT+"ceRNANetwork/ceRNAInteraction/findAll/interactionAnalysis?disease_name="+disease_trimmed+"&descending=true&top=30&information=false",
        data => {
          console.log(data);
          let column_names = Object.keys(data[0]);
          // delete run information and run id
          $("#interactions-data-table-container").html(''); //clear possible other tables
          $("#interactions-data-table-container").append(buildTable(data,'interactions-data-table', column_names))
          let table = $('.interactions-data-table').DataTable();
          table.column(6).visible( false ); // hide 'run'
        })
        
      })
      
    }
  }

}
