import {Component} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatTabsModule} from "@angular/material/tabs";
import {ReactiveFormsModule} from "@angular/forms";
import {MatExpansionModule} from "@angular/material/expansion";
import {FormComponent} from "./form/form.component";
import {CeRNAsComponent} from "./ce-rnas/ce-rnas.component";
import {InteractionsComponent} from "./interactions/interactions.component";
import {NetworkComponent} from "./network/network.component";
import {HeatmapComponent} from "./heatmap/heatmap.component";

@Component({
  selector: 'app-browse',
  imports: [
    MatSidenavModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatExpansionModule,
    FormComponent,
    CeRNAsComponent,
    InteractionsComponent,
    NetworkComponent,
    HeatmapComponent
  ],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent {

}
