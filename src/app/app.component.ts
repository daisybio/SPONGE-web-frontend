import { Component, computed, effect, inject } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  ActivatedRoute,
} from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { VersionsService } from './services/versions.service';
import { SpongEffectsService } from './services/spong-effects.service';
import { CartComponent } from './components/cart/cart.component';

@Component({
  selector: 'app-root',
  imports: [
    MatToolbar,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonToggleModule,
    FormsModule,
    CartComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  versionsService = inject(VersionsService);
  private spongEffectsService = inject(SpongEffectsService);
  title = 'SPONGE-web-frontend';
  version = this.versionsService.version$;
  disableVersionToggle = true;

  constructor(private router: Router, private route: ActivatedRoute) {
    this.router.events.subscribe(() => {
      this.checkRoute();
      this.updateAccent();
    });
    // Re-accent when the SpongEffects Compute/Explore mode toggles (same URL, no router event).
    effect(() => {
      this.spongEffectsService.selectedMode$();
      this.updateAccent();
    });
  }

  checkRoute() {
    const currentRoute = this.router.url;
    this.disableVersionToggle = currentRoute.includes('spongeffects');
  }

  /**
   * Drive the app-wide accent color from where the user is, so the highlight color signals the
   * current section. Sets body[data-accent], which global styles map onto Material's color tokens.
   * Browse (and everything unspecified) = blue, Genes+Transcripts = green, SpongEffects = purple
   * (Compute = pinkish purple, Explore = dimmed purple).
   */
  private updateAccent(): void {
    const url = this.router.url;
    let accent = 'blue';
    if (url.startsWith('/genes-transcripts')) {
      accent = 'green';
    } else if (url.startsWith('/spongeffects')) {
      accent = this.spongEffectsService.selectedMode$() === 'explore' ? 'purple-explore' : 'purple-compute';
    }
    document.body.setAttribute('data-accent', accent);
  }

  /**
   * Primary navigation, named and ordered to mirror the three "centric analysis" cards on the
   * home page. Each analysis section carries a dot in its section accent color (SpongEffects =
   * purple, Browse = blue, Genes+Transcripts = green); the active link is highlighted in the live
   * section accent. SpongEffects (Patient Centric) only exists from DB version 2 onwards.
   */
  navItems$ = computed(() => {
    const items: { label: string; path: string; color: string; light: string }[] = [
      { label: 'Disease Centric Analysis', path: 'browse', color: '#1565c0', light: '#e4edfc' },
      { label: 'Gene/Transcript Centric Analysis', path: 'genes-transcripts', color: '#2e7d32', light: '#e5f2e6' },
    ];
    if (this.version() >= 2) {
      items.unshift({ label: 'Patient Centric Analysis', path: 'spongeffects', color: '#8e3b9c', light: '#f4e3f3' });
    }
    return items;
  });

  /** Secondary links, styled like the external API/Contact links. */
  readonly secondaryNav = [
    // { label: 'New Home', path: 'newHome' },
    { label: 'Documentation', path: 'documentation' },
    { label: 'Download', path: 'download' },
  ];
}
