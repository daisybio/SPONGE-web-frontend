import { Component, OnInit } from '@angular/core';
import {Controller} from "../../control";

declare var Plotly: any;
declare var $;

@Component({
  selector: 'app-network-results',
  templateUrl: './network-results.component.html',
  styleUrls: ['./network-results.component.less']
})
export class NetworkResultsComponent implements OnInit {

  constructor() { }

  controller = new Controller()
  expandResults: true;

  ngOnInit(): void {
    this.controller.get_networkResults({disease_name: ["Breast invasive carcinoma"], level: ["gene"], callback: (data)=>{
      console.log(data);
      this.showHeatmap(data['type']['scores'], 'type');
      this.showMDS(data['type']['euclidean_distances'], 'type');
      if (Object.keys(data['subtype']).length !== 0){
        this.showHeatmap(data['subtype']['scores'], 'subtype');
        this.showMDS(data['subtype']['euclidean_distances'], 'subtype');
      } else {
        document.getElementById('subtype_heatmap_container').innerHTML ="<p>No subtypes Found for this cancer type.</p>";
        document.getElementById('subtype_mds_container').innerHTML ="<p>No subtypes Found for this cancer type.</p>";
      }
    }})
  }

  lower_tri(matrix, shape) {
    let i, j;
    for (i = 0; i < shape; i++) {
      for (j = 0; j < shape; j++) {
        if (i <= j) {
          matrix[i][j] = NaN;
        }
      }
    }
    return matrix;
  }

  showHeatmap(result, prefix, tri=true): void {
    let values = result['values'].slice();
    let x_labels = result['labels'].slice();
    let y_labels = result['labels'].slice();
    if (tri){
      values = this.lower_tri(values, values.length);
      values = values.slice(1);
      let i;
      for (i = 0; i < values.length; i++){
        values[i].pop()
      }
      x_labels.pop();
      y_labels = y_labels.slice(1);
    }
    let data = [{
      x: x_labels,
      y: y_labels,
      z: values,
      type: 'heatmap',
      hoverongaps: false,
      hovertemplate:
        '%{y}<br>' +
        '%{x}<br>' +
        'value: %{z}' +
        '<extra></extra>',
      colorscale: [[0, '#D099F2'],[1, '#540A67']],
    }];
    let layout = {
      xaxis: {
        showgrid: false,
        'automargin': true,
        'side': 'top'
      },
      yaxis: {
        showgrid: false,
        'automargin': true
      },
      height: Math.max(y_labels.length * 30, 500)
    };
    $('#pie_chart_container').empty();
    Plotly.newPlot(prefix.concat('_', 'heatmap_container'), data, layout);
  }

  showMDS(result, prefix): void {
    let data = [{
      x: result['x'],
      y: result['y'],
      text: result['labels'],
      mode: 'markers+text',
      type: 'scatter',
      marker: { size: 15 },
      textposition: 'top center',
      hoverinfo: 'text'
    }];
    let layout = {
      hovermode:'closest',
      xaxis: {
        showgrid: false,
        zeroline: false,
        linecolor: 'black',
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        linecolor: 'black',
      },
    };
    $('#pie_chart_container').empty();
    Plotly.newPlot(prefix.concat('_', 'mds_container'), data, layout);
  }

}
