import {Component} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListItem, MatNavList} from "@angular/material/list";

@Component({
  selector: 'app-documentation',
  imports: [
    MatNavList,
    MatListItem,
    MatSidenavModule
  ],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss'
})
export class DocumentationComponent {

}
