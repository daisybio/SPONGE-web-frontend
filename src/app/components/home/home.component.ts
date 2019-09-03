declare var $;
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
//import * as $ from "jquery";
import * as sigma from 'sigma-webpack';
import { ActivatedRoute } from "@angular/router";
declare var Plotly: any;


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

 //   $(document).ready(function(){
      $('[data-toggle="popover_search_info"]').popover({
       trigger: 'hover', sanitize: false, sanitizeFn: content => content
     });     
  //  });

 

 var mRNAcsv=Plotly.d3.csv("src/assets/plotData/sponge_result_mRNA_count.csv");
 var Coorelationcsv=Plotly.d3.csv("src/assets/plotData/sponge_result_mRNA_count.csv");
 


 function processData(mRNAcsv, Coorelationcsv) {
  var xmRNA=[]; var ymRNA=[]; var xCorr=[]; var yCorr=[];
	console.log(mRNAcsv);

  

	for (var i=0; i<mRNAcsv.length; i++) {
		var row = mRNAcsv[i];
		xmRNA.push( row['Cancer Type'] );
    ymRNA.push( row['Predicted mRNAs'] );
    console.log( 'T',xmRNA, 'T',ymRNA);
  }
  
  for (var i=0; i<Coorelationcsv.length; i++) {
	var 	row2 = Coorelationcsv [i];
		xCorr.push( row2['Cancer Type'] );
		yCorr.push( row2['Count of Correlations'] );
	}

//	makePlotly( xmRNA, ymRNA );
var miRNAs=  {
  x: ['Testicular germ cell tumor',
  'Pheochromocytoma & paraganglioma',
  'Liver hepatocellular carcinoma',
  'Thymoma',
  'Breast invasive carcinoma',
  'Sarcoma',
  'Colon adenocarcinoma',
  'Cervical & endocervical cancer',
  'Ovarian serous cystadenocarcinoma',
  'Prostate adenocarcinoma',
  'Brain lower grade glioma',
  'Esophageal carcinoma',
  'Stomach adenocarcinoma',
  'Head & neck squamous cell carcinoma',
  'Uterine corpus endometrioid carcinoma',
  'Thyroid carcinoma',
  'Lung squamous cell carcinoma',
  'Bladder urothelial carcinoma',
  'Kidney papillary cell carcinoma',
  'Kidney clear cell carcinoma',
  'Pancreatic adenocarcinoma',
  'Lung adenocarcinoma'],
  y: [49360078.0,
    29334455.0,
    48432536.0,
    44672893.0,
    64119040.0,
    33926911.0,
    40460559.0,
    39337160.0,
    37544112.0,
    94713550.0,
    49828004.0,
    39064440.0,
    49731749.0,
    61375428.0,
    22562615.0,
    65683979.0,
    42946569.0,
    40644258.0,
    67027109.0,
    67051666.0,
    38450658.0,
    61153123.0
    ],
  type: 'bar',
  name: 'Count of shared mRNAs',
  marker: {
    color: 'rgb(19,63,103)',
    opacity: 1
  }

};
var correlations=  {
  x: ['Testicular germ cell tumor',
  'Pheochromocytoma & paraganglioma',
  'Liver hepatocellular carcinoma',
  'Thymoma',
  'Breast invasive carcinoma',
  'Sarcoma',
  'Colon adenocarcinoma',
  'Cervical & endocervical cancer',
  'Ovarian serous cystadenocarcinoma',
  'Prostate adenocarcinoma',
  'Brain lower grade glioma',
  'Esophageal carcinoma',
  'Stomach adenocarcinoma',
  'Head & neck squamous cell carcinoma',
  'Uterine corpus endometrioid carcinoma',
  'Thyroid carcinoma',
  'Lung squamous cell carcinoma',
  'Bladder urothelial carcinoma',
  'Kidney papillary cell carcinoma',
  'Kidney clear cell carcinoma',
  'Pancreatic adenocarcinoma',
  'Lung adenocarcinoma'],
  y: [31159961,
    19538235,
    30648230,
    29918046,
    32420434,
    22388501,
    23229024,
    23610765,
    25023437,
    41520018,
    27771150,
    27284344,
    32260578,
    34348498,
    16186323,
    34799641,
    25571770,
    24624379,
    36012037,
    35536664,
    24391565,
    33146790
    ],
  type: 'bar',
  name: 'Count of predicted correations',
  marker: {
    color: 'rgb(7,117,218)',
    opacity: 1
  }

};

var data = [miRNAs, correlations];
var layout = {
  title: 'SPONGE results for each pair of genes',
  titlefont: {
    family: 'Arial, bold',
    size: 22,
    color: '#0c253d'
  },
  xaxis: {
    tickangle: -45
  },  
  barmode: 'group',
  autosize: false,
  width: 800,
  height: 800,
  margin: {
    l: 110,
    r: 70,
    b: 200,
    t: 100,
   
  },
  showlegend: true,
	legend: {
    x:0,
    y:1,
    "orientation": "h"}
};

Plotly.newPlot('Plot', data, layout, {showSendToCloud:true});

}


  processData(mRNAcsv,Coorelationcsv);

}

  




}


