import {Component} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListItem, MatNavList} from "@angular/material/list";
import {RouterLink, RouterOutlet} from "@angular/router";

@Component({
  selector: 'app-documentation',
  imports: [
    MatNavList,
    MatListItem,
    MatSidenavModule,
    RouterOutlet,
    RouterLink
  ],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss'
})
export class DocumentationComponent {

}
