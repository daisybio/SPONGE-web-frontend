import {Routes} from '@angular/router';
import {BrowseComponent} from "./routes/browse/browse.component";
import {DownloadComponent} from "./routes/download/download.component";
import {HomeComponent} from "./routes/home/home.component";
import {DocumentationComponent} from "./routes/documentation/documentation.component";
import {IntroductionComponent} from "./routes/documentation/introduction/introduction.component";
import {HomeSearchBarComponent} from "./routes/documentation/home-search-bar/home-search-bar.component";
import {
  BrowseFunctionalitiesComponent
} from "./routes/documentation/browse-functionalities/browse-functionalities.component";
import {BrowseSidebarComponent} from "./routes/documentation/browse-sidebar/browse-sidebar.component";
import {MoreComponent} from "./routes/documentation/more/more.component";
import {SpongEffectsComponent} from "./routes/spongeffects/spongeffects.component";
import {GenesComponent} from "./routes/genes/genes.component";
import {ExploreComponent} from "./routes/spongeffects/explore/explore.component";
import {PredictComponent} from "./routes/spongeffects/predict/predict.component";

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
    path: 'genes',
    component: GenesComponent
  },
  {
    path: 'documentation',
    component: DocumentationComponent,
    children: [
      {
        path: '',
        component: IntroductionComponent
      },
      {
        path: 'home-search',
        component: HomeSearchBarComponent
      },
      {
        path: 'browse-functionalities',
        component: BrowseFunctionalitiesComponent
      },
      {
        path: 'browse-sidebar',
        component: BrowseSidebarComponent
      },
      {
        path: 'more-about-sponge',
        component: MoreComponent
      },
      {
        path: '**',
        redirectTo: ''
      }
    ]
  },
  {
    path: 'download',
    component: DownloadComponent
  },
  {
    path: 'spongeffects',
    component: SpongEffectsComponent,
    children: [
      {
        path: '',
        component: ExploreComponent
      },
      {
        path: 'predict',
        component: PredictComponent
      }
    ],
  },
  {
    path: '**',
    redirectTo: ''
  }
];
