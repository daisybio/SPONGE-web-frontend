import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { BrowseService } from '../../../services/browse.service';
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
import { InfoComponent } from '../../../components/info/info.component';
import { ModalsService } from '../../../components/modals-service/modals.service';

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
  ],
  templateUrl: './nodes.component.html',
  styleUrl: './nodes.component.scss',
})
export class NodesComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  modalsService = inject(ModalsService);
  columns = ['identifier', 'betweenness', 'eigenvector', 'node_degree'];
  dataSource: MatTableDataSource<GeneNode | TranscriptNode>;
  readonly dialog = inject(MatDialog);

  constructor(browseService: BrowseService) {
    this.dataSource = new MatTableDataSource<any>(
      browseService.nodes$().map((node) => {
        return {
          identifier: BrowseService.getNodeFullName(node),
          betweenness: node.betweenness,
          eigenvector: node.eigenvector,
          node_degree: node.node_degree,
          obj: 'gene' in node ? node.gene : node.transcript,
        };
      }),
    );
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openDialog(entity: Gene | Transcript) {
    this.modalsService.openNodeDialog(entity);
  }
}
