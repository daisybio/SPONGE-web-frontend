import {AfterViewInit, Component, effect, inject, model, resource, ViewChild} from '@angular/core';
import {Gene, GOTerm} from "../../interfaces";
import {MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {VersionsService} from "../../services/versions.service";
import {BackendService} from "../../services/backend.service";
import {MatTabsModule} from "@angular/material/tabs";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatTableDataSource, MatTableModule} from "@angular/material/table";
import {MatPaginator, MatPaginatorModule} from "@angular/material/paginator";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-gene-modal',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatExpansionModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './gene-modal.component.html',
  styleUrl: './gene-modal.component.scss'
})
export class GeneModalComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  columns = ['symbol', 'description']
  goFilter = model<string>('')

  readonly gene = inject<Gene>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();

  goDatasource = new MatTableDataSource<GOTerm>();

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

  constructor() {
    effect(() => {
      this.goDatasource.data = this.goTerms$.value() ?? [];
    });

    effect(() => {
      this.goDatasource.filter = this.goFilter().trim().toLowerCase();
      console.log(this.goDatasource.filter)
    });
  }

  ngAfterViewInit(): void {
    this.goDatasource.paginator = this.paginator;
  }
}
