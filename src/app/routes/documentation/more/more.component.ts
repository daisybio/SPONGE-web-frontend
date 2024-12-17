import {Component} from '@angular/core';
import {MatAnchor, MatButton} from "@angular/material/button";
import {CdkCopyToClipboard} from "@angular/cdk/clipboard";

@Component({
  selector: 'app-more',
  imports: [
    MatAnchor,
    MatButton,
    CdkCopyToClipboard
  ],
  templateUrl: './more.component.html',
  styleUrl: './more.component.scss'
})
export class MoreComponent {
  citation = "Markus Hoffmann, Elisabeth Pachl, Michael Hartung, Veronika Stiegler, Jan Baumbach, Marcel H Schulz, Markus List, SPONGEdb: a pan-cancer resource for competing endogenous RNA interactions, NAR Cancer, Volume 3, Issue 1, March 2021, zcaa042, https://doi.org/10.1093/narcan/zcaa042"
}
