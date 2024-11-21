import {Routes} from '@angular/router';
import {BrowseComponent} from "./routes/browse/browse.component";
import {DownloadComponent} from "./routes/download/download.component";
import {HomeComponent} from "./routes/home/home.component";
import {DocumentationComponent} from "./routes/documentation/documentation.component";

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'browse',
    component: BrowseComponent
  },
  {
    path: 'documentation',
    component: DocumentationComponent
  },
  {
    path: 'download',
    component: DownloadComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
