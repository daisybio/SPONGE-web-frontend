import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
  ViewChild,
} from '@angular/core';
import {
  Gene,
  GeneInteraction,
  Transcript,
  TranscriptInteraction,
} from '../../interfaces';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { BrowseService } from '../../services/browse.service';
import { capitalize } from 'lodash';
import { InfoComponent } from '../info/info.component';
import katex from 'katex';
import { ModalsService } from '../modals-service/modals.service';
import { InfoService } from '../../services/info.service';

@Component({
  selector: 'app-interactions-table',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortHeader,
    MatSort,
    MatButton,
    MatTooltip,
    InfoComponent,
  ],
  templateUrl: './interactions-table.component.html',
  styleUrl: './interactions-table.component.scss',
})
export class InteractionsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  modalsService = inject(ModalsService);
  level$ = input<'gene' | 'transcript'>();
  interactions$ = input<(GeneInteraction | TranscriptInteraction)[]>();
  mscorEquation$ = viewChild<ElementRef<HTMLSpanElement>>('mscorEquation');
  infoService = inject(InfoService);
  columns = ['name_1', 'name_2', 'mirna', 'correlation', 'mscor', 'padj'];
  dataSource$ = computed(() => {
    return new MatTableDataSource(
      (this.interactions$() || []).map((interaction) => {
        const names = BrowseService.getInteractionFullNames(interaction);
        return {
          name_1: names[0],
          name_2: names[1],
          correlation: interaction.correlation,
          mscor: interaction.mscor,
          padj: interaction.p_value,
          obj1:
            'gene1' in interaction
              ? interaction.gene1
              : interaction.transcript_1,
          obj2:
            'gene2' in interaction
              ? interaction.gene2
              : interaction.transcript_2,
          interaction,
        };
      }),
    );
  });
  protected readonly capitalize = capitalize;

  constructor() {
    effect(() => {
      this.infoService.renderMscorEquation(this.mscorEquation$()!);
    });
  }

  ngAfterViewInit(): void {
    const dataSource = this.dataSource$();
    dataSource.paginator = this.paginator;
    dataSource.sort = this.sort;
  }

  openMiRNADialog(interaction: GeneInteraction | TranscriptInteraction) {
    this.modalsService.openMiRNADialog(interaction);
  }

  openDialog(entity: Gene | Transcript) {
    this.modalsService.openNodeDialog(entity);
  }
}
