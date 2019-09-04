import { Component, OnInit } from '@angular/core';
import { Controller } from "../../control";
import { Helper } from "../../helper";
import { ActivatedRoute } from "@angular/router";

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

    var search_key: String;
    var parsed_search_result: any;

    this.route.queryParams
    .subscribe(params => {
      search_key = params.search_key;
    });

    function parse_cerna_response(response) {
      response.forEach(interaction => {
        let interaction_info = {};
        let gene_to_extract;
        let disease = interaction['run']['dataset']['disease_name']
        // parse the information
        let correlation = interaction['correlation']
        // usually get information for other gene, extract information for key gene only once
        if (interaction['gene1']['ensg_number'] == search_key) {
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

      // build table out of parsed result for each disease
      let list_diseases = $('#list_diseases')
      for (let disease in parsed_search_result['diseases']) {
        let disease_trimmed = disease.split(' ').join('')
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
           ""
          "</div>"+
        "</div>"+
        "</div>"
        $('#disease_accordion').append(accordion_card)

        let table = helper.buildTable(
          parsed_search_result['diseases'][disease], 
          disease_trimmed+"-table", 
          Object.keys(parsed_search_result['diseases'][disease][0])
          )
        $('#collapse_'+disease_trimmed).find('.card-body').html(table)

        $("#"+disease_trimmed+"-table").DataTable()
      }
    }

    /* search_key is defined */
    if (search_key != undefined) {
      parsed_search_result = {}
      parsed_search_result['diseases'] = {}
      parsed_search_result['key'] = undefined

      // check if key is ENSG number
      if (search_key.startsWith('ENSG')) {
        controller.get_ceRNA_interactions_all({
          ensg_number: [search_key],
          limit: 21,
          callback: (response) => {
            parse_cerna_response(response)
          }
        })
      } else {
        // key is gene symbol
        controller.get_ceRNA_interactions_all({
          gene_symbol: [search_key],
          limit: 21,
          callback: (response) => {
            parse_cerna_response(response)
          }
        })
      }
    }

  }

}
