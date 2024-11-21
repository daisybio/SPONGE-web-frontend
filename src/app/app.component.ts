import {Component} from '@angular/core';
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-root',
  imports: [MatButton],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'SPONGE-web-frontend';
}
