import { Component, OnInit } from '@angular/core';
import { Controller } from "../../control";
import { Helper } from "../../helper";
import { ActivatedRoute } from "@angular/router";
import 'datatables.net';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.less']
})
export class SearchComponent implements OnInit {

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    
    const controller = new Controller()
    const helper = new Helper()

    var search_key: string;
    var key_is_ensg = false;
    var key_is_gene_symbol = false;
    var key_is_mimat = false;
    var parsed_search_result: any;

    this.route.queryParams
    .subscribe(params => {
      search_key = params.search_key;
    });

    main()


    function main() {
      /* search_key is defined */
      if (search_key != undefined) {
        // start loading data
        $('#loading_spinner_results').removeClass('hidden')
        parsed_search_result = {}
        parsed_search_result['diseases'] = {}
        parsed_search_result['key'] = undefined

        // check if key is ENSG number
        if (search_key.startsWith('ENSG')) {
          key_is_ensg = true;
          key_is_gene_symbol = false;
          key_is_mimat = false;
          controller.get_ceRNA_interactions_all({
            ensg_number: [search_key],
            limit: 11,
            callback: (response) => {
              parse_cerna_response(response)
              // end loading 
              $('#loading_spinner_results').addClass('hidden')
            }
          })
        } else {
          // key is gene symbol
          key_is_ensg = false;
          key_is_gene_symbol = true;
          key_is_mimat = false;
          controller.get_ceRNA_interactions_all({
            gene_symbol: [search_key],
            limit: 11,
            callback: (response) => {
              parse_cerna_response(response)
              // end loading
              $('#loading_spinner_results').addClass('hidden')
            }
          })
        }
      }
    }

    function push_interaction_filters(table_id:string) {
      $.fn.dataTable.ext.search.push(
        // filter for mscor
        function( settings, data, dataIndex) {
          if ( settings.nTable.id !== table_id ) {
            return true;
          }
          var mscore_min = parseFloat( $('#mscore_min_'+table_id).val().toString());
          var mscore_max = parseFloat( $('#mscore_max_'+table_id).val().toString());
          var mscore = parseFloat( data[5] ) || 0; // use data for the mscor column
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
        function( settings, data, dataIndex) {
          if ( settings.nTable.id !== table_id ) {
            return true;
          }
          var pvalue_min = parseFloat( $('#pvalue_min_'+table_id).val().toString());
          var pvalue_max = parseFloat( $('#pvalue_max_'+table_id).val().toString());
          var pvalue = parseFloat( data[6] ) || 0; // use data for the pvalue column
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
    }

    function parse_cerna_response(response) {
      response.forEach(interaction => {
        let interaction_info = {};
        let gene_to_extract;
        let disease = interaction['run']['dataset']['disease_name']
        // parse the information
        let correlation = interaction['correlation']
        // usually get information for other gene, extract information for key gene only once
        if (interaction['gene1']['ensg_number'] == search_key || interaction['gene1']['gene_symbol'] == search_key) {
          // gene1 is search gene, gene2 is not 
          gene_to_extract = 'gene2'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene1']
          }
        } else {
          // gene1 is not search gene, gene2 is
          gene_to_extract = 'gene1'
          // get search gene info if still undefined
          if (parsed_search_result['key'] == undefined) {
            parsed_search_result['key'] = interaction['gene2']
          }
        }

        if (!(disease in parsed_search_result['diseases'])) {
          parsed_search_result['diseases'][disease] = []
        }

        interaction_info['ensg_number'] = interaction[gene_to_extract]['ensg_number']
        interaction_info['gene_symbol'] = interaction[gene_to_extract]['gene_symbol']
        interaction_info['gene_type'] = interaction[gene_to_extract]['gene_type']
        interaction_info['chromosome'] = interaction[gene_to_extract]['chromosome_name']
        interaction_info['correlation'] = interaction['correlation']
        //interaction_info['gene'] = interaction[gene_to_extract]['gene_ID']
        interaction_info['mscor'] = interaction['mscore']
        interaction_info['p-value'] = interaction['p_value']
        
        parsed_search_result['diseases'][disease].push(interaction_info)
      
      }); // end for each

      // Set key-gene information
      let key_information = {
        gene: parsed_search_result['key']['ensg_number'],
        gene_symbol: parsed_search_result['key']['gene_symbol'],
        chromosome: parsed_search_result['key']['chromosome_name']
      }
      let key_information_sentence = "For gene "+key_information['gene']
      if (key_information['gene_symbol'] != '') {
        key_information_sentence += " ("+key_information['gene_symbol']+")" 
      }
      key_information_sentence += " on chromosome "+key_information['chromosome']

      $('#key_information').html(key_information_sentence)

      // build table out of parsed result for each disease
      let list_diseases = $('#list_diseases')
      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('')
        let table_id:string = disease_trimmed+"-table"
        let accordion_card = "<div class='card'>"+
        "<div class='card-header' id='heading_"+disease_trimmed+"'>"+
        "  <h5 class='mb-0'>"+
            "<button class='btn btn-link' data-toggle='collapse' data-target='#collapse_"+disease_trimmed+"' aria-expanded='true' aria-controls='collapse_"+disease_trimmed+"'>"+
              disease+
            "</button>"+
          "</h5>"+
        "</div>"+
        "<div id='collapse_"+disease_trimmed+"' class='collapse show' aria-labelledby='headingOne' data-parent='#disease_accordion'>"+
          "<div class='card-body'>"+
            "<button class='btn btn-secondary button-margin' type='button' data-toggle='collapse' data-target='#control_"+table_id+"' aria-expanded='false'>"+
                "Options"+
            "</button>"+
            "<div class='collapse' id='control_"+table_id+"'>"+
                "<div class='card card-body'>"+
                "<div>"+
                  "<p>Set filter for mscor</p>"+
                  "<span>Minimum: </span><input type='text' id='mscore_min_"+table_id+"' name='mscore_min'>&nbsp;"+
                  "<span>Maximum: </span><input type='text' id='mscore_max_"+table_id+"' name='mscore_max'>"+
                "</div>"+
                "<hr>"+
                "<div>"+
                    "<p>Set filter for P-value</p>"+
                    "<span>Minimum: </span><input type='text' id='pvalue_min_"+table_id+"' name='pvalue_min'>&nbsp;"+
                    "<span>Maximum: </span><input type='text' id='pvalue_max_"+table_id+"' name='pvalue_max'>"+
                "</div>"+
              "</div>"+
            "</div>"+
            "<div class='card-body-table'></div>"+
           ""+
          "</div>"+
        "</div>"+
        "</div>"
        $('#disease_accordion').append(accordion_card)
        
        let html_table = helper.buildTable(
          parsed_search_result['diseases'][disease], 
          table_id, 
          Object.keys(parsed_search_result['diseases'][disease][0])
          )
        $('#collapse_'+disease_trimmed).find('.card-body-table').html(html_table)
        
        push_interaction_filters(table_id)
        var table = $("#"+table_id).DataTable({
          orderCellsTop: true,
        })
        // setup for colsearch
        $('#'+table_id+' thead tr').clone(true).appendTo( '#'+table_id+' thead' )
        $('#'+table_id+' thead tr:eq(1) th').unbind()
        $('#'+table_id+' thead tr:eq(1) th').each( function (i) {
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
        
        $('#mscore_min_'+table_id+', #mscore_max_'+table_id+', #pvalue_min_'+table_id+', #pvalue_max_'+table_id).keyup(()=>{
          table.draw()
        })
        // make rows selectable
        $('#'+table_id+' tbody').on( 'click', 'tr', function () {
          $(this).toggleClass('selected');
        })
        
      }
    }

    /* search_key is defined */
    if (search_key != undefined) {
      // start loading data
      $('#loading_spinner_results').removeClass('hidden')
      parsed_search_result = {}
      parsed_search_result['diseases'] = {}
      parsed_search_result['key'] = undefined

      // check if key is ENSG number
      if (search_key.startsWith('ENSG')) {
        controller.get_ceRNA_interactions_all({
          ensg_number: [search_key],
          limit: 11,
          callback: (response) => {
            parse_cerna_response(response)
            // end loading 
            $('#loading_spinner_results').addClass('hidden')
          }
        })
      } else {
        // key is gene symbol
        controller.get_ceRNA_interactions_all({
          gene_symbol: [search_key],
          limit: 11,
          callback: (response) => {
            parse_cerna_response(response)
            // end loading
            $('#loading_spinner_results').addClass('hidden')
          }
        })
      }
    }

  }

}
