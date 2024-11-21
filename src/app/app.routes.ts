import {Routes} from '@angular/router';
import {TutorialComponent} from "./routes/tutorial/tutorial.component";
import {BrowseComponent} from "./routes/browse/browse.component";
import {InfoComponent} from "./routes/info/info.component";
import {DownloadComponent} from "./routes/download/download.component";
import {HomeComponent} from "./routes/home/home.component";

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'tutorial',
    component: TutorialComponent
  },
  {
    path: 'browse',
    component: BrowseComponent
  },
  {
    path: 'info',
    component: InfoComponent
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
