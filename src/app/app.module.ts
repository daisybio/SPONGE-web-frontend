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
import { NetworkResultsComponent } from './components/network-results/network-results.component';
import {MatFormFieldModule} from '@angular/material/form-field';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { GseaComponent } from './components/gsea/gsea.component';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {NgxDropzoneModule} from 'ngx-dropzone';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatSliderModule} from '@angular/material/slider';
import {MatInputModule} from '@angular/material/input';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatCardModule} from '@angular/material/card';
import {MatTableModule} from '@angular/material/table';
import {MatIconModule} from '@angular/material/icon';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatListModule} from '@angular/material/list';
import {MatChipsModule} from '@angular/material/chips';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatSortModule} from '@angular/material/sort';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatTreeModule} from '@angular/material/tree';
import { SpongEffectsComponent } from './components/spong-effects/spong-effects.component';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatProgressBarModule} from '@angular/material/progress-bar';


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
    NetworkResultsComponent
    GseaComponent
    SpongEffectsComponent
  ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        AutosizeModule,
        BrowserAnimationsModule,
        MatTabsModule,
        MatLineModule,
        GBrowserModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        NgxMatSelectSearchModule,
        NgxSliderModule,
        ClipboardModule,
        NgxDropzoneModule,
        MatExpansionModule,
        MatSliderModule,
        MatInputModule,
        ReactiveFormsModule,
        MatSelectModule,
        FormsModule,
        MatButtonModule,
        MatTooltipModule,
        MatCardModule,
        MatTableModule,
        MatIconModule,
        MatGridListModule,
        MatListModule,
        MatChipsModule,
        DragDropModule,
        MatSortModule,
        MatPaginatorModule,
        MatCheckboxModule,
        MatSlideToggleModule,
        MatTreeModule,
        MatButtonToggleModule,
        MatSidenavModule,
        MatProgressBarModule
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
