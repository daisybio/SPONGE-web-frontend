import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {CarouselComponent, SlideComponent} from "ngx-bootstrap/carousel";
import {BackendService} from "../../services/backend.service";
import {Dataset, OverallCounts} from "../../interfaces";
import {MatTab, MatTabGroup} from "@angular/material/tabs";

declare const Plotly: any;

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    CarouselComponent,
    SlideComponent,
    MatTabGroup,
    MatTab
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('cancerPlot') cancerPlot!: ElementRef;
  @ViewChild('nonCancerPlot') nonCancerPlot!: ElementRef;

  imageRoot: string = '/';
  images: string[] = ['1.svg', '2.png', '3.svg']
  overallCounts: Promise<OverallCounts[]>;
  diseases: Promise<Dataset[]>;

  constructor(private backend: BackendService) {
    this.diseases = this.backend.getDatasets();
    this.overallCounts = this.backend.getOverallCounts();
  }

  async ngAfterViewInit() {
    this.plot(this.cancerPlot, true);
    this.plot(this.nonCancerPlot, false);
  }

  async plot(element: ElementRef, useCancer: boolean) {
    const diseases = (await this.diseases).filter(d => (d.disease_type === 'cancer') === useCancer);
    const overallCounts = (await this.overallCounts).filter(c => diseases.some(d => d.disease_name === c.disease_name));
    const countField = 'count_interactions_sign';
    const sortedCounts = overallCounts.sort((a, b) => b[countField] - a[countField]);
    const names = sortedCounts.map(c => c.disease_name);
    const counts = sortedCounts.map(c => c[countField]);
    Plotly.newPlot(element.nativeElement, [{
      x: names,
      y: counts,
      type: 'bar'
    }], {
      title: 'Count of significant interactions',
      yaxis: {
        type: 'log'
      },
      margin: {
        b: 300
      }
    });
  }

  resize() {
    Plotly.Plots.resize(this.cancerPlot.nativeElement);
    Plotly.Plots.resize(this.nonCancerPlot.nativeElement);
  }
}
