import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {BrowseService} from "../../../services/browse.service";
import {ReplaySubject} from "rxjs";
import {toObservable} from "@angular/core/rxjs-interop";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma";
import {Settings} from "sigma/settings";

const sigma_settings: Partial<Settings> = {
  defaultNodeColor: '#052444'
}

@Component({
  selector: 'app-network',
  imports: [],
  template: '<div #container style="height: 500px"></div>',
  styleUrl: './network.component.scss'
})
export class NetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild("container") container!: ElementRef;
  graph$ = new ReplaySubject<Graph>();
  sigma?: Sigma;

  constructor(private browseService: BrowseService) {
    toObservable(this.browseService.data$).subscribe(data => {
      const ceRNAs = data.ceRNAs;
      const interactions = data.interactions;

      const graph = new Graph();

      ceRNAs.forEach(ceRNA => {
        graph.addNode(ceRNA.gene.ensg_number, {
          label: ceRNA.gene.gene_symbol || ceRNA.gene.ensg_number,
          x: Math.random(), // Coordinates will be overridden by the layout algorithm
          y: Math.random(),
          size: Math.log(ceRNA.node_degree)
        });
      });

      interactions.forEach(interaction => {
        graph.addEdge(interaction.gene1.ensg_number, interaction.gene2.ensg_number);
      });

      forceAtlas2.assign(graph, {
        iterations: 100,
        settings: forceAtlas2.inferSettings(graph)
      });

      this.graph$.next(graph);
    })
  }

  ngAfterViewInit(): void {
    this.graph$.subscribe(graph => {
      this.sigma?.kill();
      this.sigma = new Sigma(graph, this.container.nativeElement, sigma_settings);

      this.sigma.on('clickNode', event => {
        console.log(event)
      });
    });
  }

  ngOnDestroy(): void {
    this.sigma?.kill();
  }
}
