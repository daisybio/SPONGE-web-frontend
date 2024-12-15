import { Component, OnInit, AfterViewInit } from '@angular/core';
import {MatDrawer, MatDrawerContainer, MatDrawerContent} from "@angular/material/sidenav";
import {MatListItem, MatNavList} from "@angular/material/list";
import {RouterLink, RouterOutlet} from "@angular/router";
// import { Tab, Cancer, PlotlyData } from '../../models/spongeffects.model';

@Component({
  selector: 'app-spongeffects',
  templateUrl: './spongeffects.component.html',
  imports: [
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatListItem,
    MatNavList,
    RouterLink,
    RouterOutlet
  ],
  styleUrls: ['./spongeffects.component.scss']
})
export class SpongEffectsComponent implements OnInit, AfterViewInit {
  // tabs: Tab[] = [
  //   { value: "explore", viewValue: "Explore", icon: "../../../assets/img/magnifying_glass.png" },
  //   { value: "predict", viewValue: "Predict", icon: "../../../assets/img/chip-intelligence-processor-svgrepo-com.png" }
  // ];
  // selectedTab: Tab = this.tabs[0];
  // cancers: Cancer[] = [];
  // selectedCancer: Cancer | undefined = undefined;
  // sampleDistributionData: PlotlyData | undefined;

  constructor() {}

  ngOnInit(): void {
    // Initialisierungslogik
  }

  ngAfterViewInit(): void {
    // Logik nach dem Laden der Ansicht
  }

  // setTab(tab: Tab) {
  //   this.selectedTab = tab;
  // }
  //
  // setPreviewCancer(cancer: Cancer) {
  //   this.selectedCancer = cancer;
  //   this.sampleDistributionData = this.getSampleDistributionData();
  // }

  // getSampleDistributionData(): PlotlyData {
  //   if (!this.selectedCancer) {
  //     return { data: [], layout: {}, config: {} };
  //   }
  //   return {
  //     data: [
  //       {
  //         values: this.selectedCancer.sampleSizes,
  //         labels: this.selectedCancer.allSubTypes,
  //         type: "pie",
  //         hoverinfo: 'label+value+percent',
  //         textinfo: 'none'
  //       }
  //     ],
  //     layout: {
  //       autosize: true,
  //       showlegend: true,
  //       legend: { "orientation": "h" },
  //       margin: { b: 5, l: 5, r: 5, t: 50 },
  //       title: {
  //         text: "Sample distribution of " + this.selectedCancer.value + " (" + this.selectedCancer.totalNumberOfSamples() + " samples)",
  //         font: { size: 14 }
  //       }
  //     },
  //     config: { responsive: true }
  //   };
  // }

  onFileSelected(files: File[]) {
    // Logik für den Datei-Upload
  }
}
