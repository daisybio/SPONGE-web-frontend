import { Component, OnInit } from '@angular/core';
import * as $ from "jquery";
import * as sigma from 'sigma-webpack';
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit {
  home_search: string;
  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.queryParams
    .subscribe(params => {
      this.home_search = params.home_search;
    });

    if (this.home_search != undefined) {
      // check if gene or mirna
      if (this.home_search ) {
        // gene
      }
    }
    
    $('#home_search_button').click( () => {
      let input = $('#home_search').val()
      })

    
  }

  
  
}


