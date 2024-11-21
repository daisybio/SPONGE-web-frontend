import {Component} from '@angular/core';
import {MatAnchor} from "@angular/material/button";
import {MatToolbar} from "@angular/material/toolbar";
import {RouterLink, RouterOutlet} from "@angular/router";

@Component({
  selector: 'app-root',
  imports: [MatToolbar, RouterLink, RouterOutlet, MatAnchor],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'SPONGE-web-frontend';
  subpages = ['Browse', 'Documentation', 'Download'];
}
