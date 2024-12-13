import {Component, inject, model, ViewChild} from '@angular/core';
import {GOTerm, Transcript} from "../../interfaces";
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
import {BrowseService} from "../../services/browse.service";

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
  templateUrl: './transcript-modal.component.html',
  styleUrl: './transcript-modal.component.scss'
})
export class TranscriptModalComponent {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  columns = ['symbol', 'description']
  goFilter = model<string>('')

  readonly transcript = inject<Transcript>(MAT_DIALOG_DATA);
  readonly versionsService = inject(VersionsService);
  readonly backend = inject(BackendService);
  readonly version$ = this.versionsService.versionReadOnly();

  goDatasource = new MatTableDataSource<GOTerm>();
  protected readonly BrowseService = BrowseService;

  constructor() {
  }
}
