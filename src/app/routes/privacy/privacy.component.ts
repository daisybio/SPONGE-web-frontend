import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

type Lang = 'de' | 'en';

@Component({
  selector: 'app-privacy',
  imports: [MatButtonToggleModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // the footer links to /privacy#de (Datenschutz) and /privacy#en (Privacy Policy)
  readonly lang = signal<Lang>('en');

  constructor() {
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      this.lang.set(fragment === 'de' ? 'de' : 'en');
    });
  }

  setLang(lang: Lang) {
    this.router.navigate([], { fragment: lang, replaceUrl: true });
  }
}
