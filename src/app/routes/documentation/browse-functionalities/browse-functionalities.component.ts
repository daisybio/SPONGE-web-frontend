import {Component} from '@angular/core';
import {MatTableModule} from "@angular/material/table";

@Component({
  selector: 'app-browse-functionalities',
  imports: [
    MatTableModule
  ],
  templateUrl: './browse-functionalities.component.html',
  styleUrl: './browse-functionalities.component.scss'
})
export class BrowseFunctionalitiesComponent {
  columns = ["name", "description"];
  features = [
    {
      "name": "Title Banner Select",
      "description": "Select one of the cancer sets, which should be used for a network."
    },
    {
      "name": "Click on a Node",
      "description": "Survival Analysis (Kaplan-Meier Plot) will be displayed for the Node."
    },
    {
      "name": "Hover over Node/Edge",
      "description": "Values such as Mscore, p-value, betweenness, correlation, and gene IDs will be displayed in a side table."
    },
    {
      "name": "Search under network",
      "description": "Select a ENSG number or interaction of interest (number), and it will be colored and focused on in the network."
    },
    {
      "name": "Save as",
      "description": "You can save and download the plot as .jpg or .png."
    },
    {
      "name": "Reset camera",
      "description": "Reset the viewpoint of the network after zooming or focusing on a node."
    },
    {
      "name": "Force atlas 2/start layout",
      "description": "Start a layout for a better visualization of the network."
    },
    {
      "name": "Reset Colors",
      "description": "Deselect clicked nodes."
    }
  ]
}
