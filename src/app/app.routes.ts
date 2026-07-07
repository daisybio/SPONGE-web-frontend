import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./routes/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'browse',
    loadComponent: () =>
      import('./routes/browse/browse.component').then((m) => m.BrowseComponent),
  },
  {
    path: 'genes-transcripts',
    loadComponent: () =>
      import('./routes/genes/genes.component').then((m) => m.GenesComponent),
  },
  {
    path: 'documentation',
    loadComponent: () =>
      import('./routes/documentation/documentation.component').then(
        (m) => m.DocumentationComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./routes/documentation/introduction/introduction.component').then(
            (m) => m.IntroductionComponent
          ),
      },
      {
        path: 'example-script',
        loadComponent: () =>
          import('./routes/documentation/example-script/example-script.component').then(
            (m) => m.ExampleScriptComponent
          ),
      },
      {
        path: 'home-search',
        loadComponent: () =>
          import('./routes/documentation/home-search-bar/home-search-bar.component').then(
            (m) => m.HomeSearchBarComponent
          ),
      },
      {
        path: 'browse-functionalities',
        loadComponent: () =>
          import('./routes/documentation/browse-functionalities/browse-functionalities.component').then(
            (m) => m.BrowseFunctionalitiesComponent
          ),
      },
      {
        path: 'browse-sidebar',
        loadComponent: () =>
          import('./routes/documentation/browse-sidebar/browse-sidebar.component').then(
            (m) => m.BrowseSidebarComponent
          ),
      },
      {
        path: 'more-about-sponge',
        loadComponent: () =>
          import('./routes/documentation/more/more.component').then(
            (m) => m.MoreComponent
          ),
      },
      {
        path: 'genes-tab',
        loadComponent: () =>
          import('./routes/documentation/v2/genes-tab/genes-tab.component').then(
            (m) => m.GenesTabComponent
          ),
      },
      {
        path: 'browse-tab',
        loadComponent: () =>
          import('./routes/documentation/v2/browse-tab/browse-tab.component').then(
            (m) => m.BrowseTabComponent
          ),
      },
      {
        path: 'spongeffects-tab',
        loadComponent: () =>
          import('./routes/documentation/v2/spongeffects-tab/spongeffects-tab.component').then(
            (m) => m.SpongeffectsTabComponent
          ),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
  {
    path: 'download',
    loadComponent: () =>
      import('./routes/download/download.component').then(
        (m) => m.DownloadComponent
      ),
  },
  {
    path: 'spongeffects',
    loadComponent: () =>
      import('./routes/spongeffects/spongeffects.component').then(
        (m) => m.SpongEffectsComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./routes/spongeffects/explore/explore.component').then(
            (m) => m.ExploreComponent
          ),
      },
      {
        path: 'predict',
        loadComponent: () =>
          import('./routes/spongeffects/predict/predict.component').then(
            (m) => m.PredictComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
