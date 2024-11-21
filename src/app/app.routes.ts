import {Routes} from '@angular/router';
import {TutorialComponent} from "./pages/tutorial/tutorial.component";
import {BrowseComponent} from "./pages/browse/browse.component";
import {InfoComponent} from "./pages/info/info.component";
import {DownloadComponent} from "./pages/download/download.component";
import {HomeComponent} from "./pages/home/home.component";

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
