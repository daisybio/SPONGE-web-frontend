import {Component, computed, inject} from '@angular/core';
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
  versionsService = inject(VersionsService);
  title = 'SPONGE-web-frontend';
  version = this.versionsService.version$;

  subpages$ = computed(() => {
    if (this.version() < 2) {
      return ['Browse', 'Genes', 'Documentation', 'Download']
    } else {
      return ['Browse', 'Genes', 'SpongEffects', 'Documentation', 'Download']
    }
  })
}
