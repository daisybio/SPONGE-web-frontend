import {Component, inject, resource} from '@angular/core';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListItem, MatNavList} from "@angular/material/list";
import {RouterLink, RouterOutlet} from "@angular/router";
import { VersionsService } from '../../services/versions.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-documentation',
  imports: [
    MatNavList,
    MatListItem,
    MatSidenavModule,
    RouterOutlet,
    RouterLink,
  ],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss'
})
export class DocumentationComponent {
    versionService = inject(VersionsService);
    version$ = this.versionService.versionReadOnly();

    constructor(private router: Router) {}
    
    version_change = resource({
        request: this.version$,
        loader: async () => {
            this.router.navigate(["/documentation/"]);
        }
    });
}
