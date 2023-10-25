import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './components/home/home.component';
import { SearchComponent } from './components/search/search.component';
import { BrowseComponent } from './components/browse/browse.component';
import { MoreComponent } from './components/more/more.component';
import { CreditsComponent } from './components/credits/credits.component';
import { TutorialComponent } from './components/tutorial/tutorial.component';
import { AutosizeModule } from 'ngx-autosize';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { DownloadComponent } from './components/download/download.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatTabsModule} from '@angular/material/tabs';
import {MatLineModule} from '@angular/material/core';
import {GBrowserModule} from 'g-browser';
import { MatSelectModule } from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input'; 
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { GseaComponent } from './components/gsea/gsea.component';
import {MatExpansionModule} from '@angular/material/expansion';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    SearchComponent,
    BrowseComponent,
    MoreComponent,
    CreditsComponent,
    TutorialComponent,
    DownloadComponent,
    GseaComponent
  ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        AutosizeModule,
        BrowserAnimationsModule,
        MatTabsModule,
        MatLineModule,
        GBrowserModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        NgxMatSelectSearchModule,
        NgxSliderModule,
        MatExpansionModule    
    ],

  providers: [
    {
      provide: APP_BASE_HREF,
      useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM() || '/',
      deps: [PlatformLocation]
    }],
  bootstrap: [AppComponent]
})
export class AppModule { }
