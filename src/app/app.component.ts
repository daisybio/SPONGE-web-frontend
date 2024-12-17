import {Component, WritableSignal} from '@angular/core';
import {MatAnchor} from "@angular/material/button";
import {MatToolbar} from "@angular/material/toolbar";
import {RouterLink, RouterOutlet} from "@angular/router";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {FormsModule} from "@angular/forms";
import {VersionsService} from "./services/versions.service";

@Component({
  selector: 'app-root',
  imports: [MatToolbar, RouterLink, RouterOutlet, MatAnchor, MatButtonToggleModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  subpages = ['Browse', 'Genes', 'Documentation', 'Download'];
  version: WritableSignal<number>;

  constructor(versionsService: VersionsService) {
    this.version = versionsService.version$;
  }
}
