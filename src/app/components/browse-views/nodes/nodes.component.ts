import {
  AfterViewInit,
  Component,
  inject,
  input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
import { exportToCSV } from '../../../utils/export';
import {
  Gene,
  GeneNode,
  Transcript,
  TranscriptNode,
} from '../../../interfaces';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { InfoComponent } from '../../info/info.component';
import { ModalsService } from '../../modals-service/modals.service';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AddToCartButtonComponent } from '../../add-to-cart-button/add-to-cart-button.component';

@Component({
  selector: 'app-nodes',
  imports: [
    MatTableModule,
    MatPaginator,
    MatSort,
    MatSortHeader,
    MatButton,
    MatTooltip,
    InfoComponent,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    AddToCartButtonComponent,
  ],
  templateUrl: './nodes.component.html',
  styleUrl: './nodes.component.scss',
})
export class NodesComponent implements AfterViewInit, OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  modalsService = inject(ModalsService);
  columns = ['identifier', 'betweenness', 'eigenvector', 'node_degree'];
  dataSource = new MatTableDataSource<any>([]);
  readonly dialog = inject(MatDialog);

  browseService = input.required<BrowseService>();

  ngOnInit() {
    this.updateDataSource();
  }

  updateDataSource() {
    this.dataSource.data = this.browseService()
      .nodes$()
      .map((node) => {
        return {
          identifier: BrowseService.getNodeFullName(node),
          betweenness: node.betweenness,
          eigenvector: node.eigenvector,
          node_degree: node.node_degree,
          obj: 'gene' in node ? node.gene : node.transcript,
        };
      });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openDialog(entity: Gene | Transcript) {
    this.modalsService.openNodeDialog(entity);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  downloadCSV() {
    exportToCSV(this.dataSource.data, 'genes_transcripts_table');
  }
}
