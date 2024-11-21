import {Component} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatToolbar} from "@angular/material/toolbar";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-root',
  imports: [MatButton, MatToolbar, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'SPONGE-web-frontend';
  subpages = [
    "Tutorial",
    "Browse",
    "Info",
    "Download",
    "API"
  ]
}
