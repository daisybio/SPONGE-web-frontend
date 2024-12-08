import {Component, inject, resource} from '@angular/core';
import {Gene} from "../../interfaces";
import {MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {VersionsService} from "../../services/versions.service";
import {BackendService} from "../../services/backend.service";
import {MatTabsModule} from "@angular/material/tabs";
import {MatExpansionModule} from "@angular/material/expansion";

@Component({
  selector: 'app-gene-modal',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatExpansionModule,
  ],
  templateUrl: './gene-modal.component.html',
  styleUrl: './gene-modal.component.scss'
})
export class GeneModalComponent {
  readonly gene = inject<Gene>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();

  readonly geneInfo$ = resource({
    request: this.version$,
    loader: async (version) => this.backend.getGeneInfo(version.request, this.gene.ensg_number).then(info => info[0])
  })

  readonly goTerms$ = resource({
    request: this.version$,
    loader: async (version) => this.backend.getGOterms(version.request, this.gene.gene_symbol)
  })

  readonly hallmarks$ = resource({
    request: this.version$,
    loader: async (version) => this.backend.getHallmark(version.request, this.gene.gene_symbol)
  })

  readonly wikipathways$ = resource({
    request: this.version$,
    loader: async (version) => this.backend.getWikiPathways(version.request, this.gene.gene_symbol)
  })
}
