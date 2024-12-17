import {Component} from '@angular/core';
import {MatTableModule} from "@angular/material/table";

@Component({
  selector: 'app-browse-sidebar',
  imports: [MatTableModule],
  templateUrl: './browse-sidebar.component.html',
  styleUrl: './browse-sidebar.component.scss'
})
export class BrowseSidebarComponent {
  columns = ["name", "description"];
  features = [
    {
      "name": "Nodes & Edges",
      "description": "Here you can find tables of the nodes and edges of the network with detailed information. They are in the same style as the search table and also hold the same functionalities."
    },
    {
      "name": "Run Information & Settings",
      "description": "This section is for further configuration of the selected cancer set. Define a value to sort by, set a cutoff for the node degree, and define the number of nodes with the limit."
    },
    {
      "name": "Data of visualized run",
      "description": "Inspect the exact properties of the current network."
    },
    {
      "name": "Download original data",
      "description": "Links you to the TCGA website."
    }
  ]
}
