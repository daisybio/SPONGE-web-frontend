import {Component, input} from '@angular/core';
import {GseaResult} from "../../../../interfaces";

@Component({
  selector: 'app-gsearesults',
  imports: [],
  templateUrl: './gsearesults.component.html',
  styleUrl: './gsearesults.component.scss'
})
export class GSEAresultsComponent {
  results$ = input.required<GseaResult[]>();
}
