import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  viewChild,
  ViewChild,
} from '@angular/core';
import { exportToCSV } from '../../utils/export';
import {
  Dataset,
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
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { BrowseService } from '../../services/browse.service';
import { capitalize } from 'lodash';
import { InfoComponent } from '../info/info.component';
import { ModalsService } from '../modals-service/modals.service';
import { InfoService } from '../../services/info.service';
import { AddToCartButtonComponent } from '../add-to-cart-button/add-to-cart-button.component';

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
    MatSliderModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    DecimalPipe,
    AddToCartButtonComponent,
  ],
  templateUrl: './interactions-table.component.html',
  styleUrl: './interactions-table.component.scss',
})
export class InteractionsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  modalsService = inject(ModalsService);
  level$ = input<'gene' | 'transcript'>();
  interactions$ = input.required<(GeneInteraction | TranscriptInteraction)[]>();
  disease$ = input.required<Dataset | undefined>({
    alias: 'disease',
  });
  mscorEquation$ = viewChild<ElementRef<HTMLSpanElement>>('mscorEquation');
  infoService = inject(InfoService);
  columns = ['name_1', 'name_2', 'mirna', 'correlation', 'mscor', 'padj'];

  minPValue = model(0);
  maxPValue = model(1);
  minMscor = model(0);
  maxMscor = model(1);
  searchText = model('');

  dataSource = new MatTableDataSource<any>([]);

  constructor() {
    effect(() => {
      this.infoService.renderMscorEquation(this.mscorEquation$()!);
    });

    // Initialize slider values to data limits
    effect(() => {
      const pLimits = this.pValueLimits();
      const mscorLim = this.mscorLimits();

      if (pLimits.min !== Infinity && pLimits.max !== -Infinity) {
        this.minPValue.set(pLimits.min);
        this.maxPValue.set(pLimits.max);
      }
      if (mscorLim.min !== Infinity && mscorLim.max !== -Infinity) {
        this.minMscor.set(mscorLim.min);
        this.maxMscor.set(mscorLim.max);
      }
    });

    // Push the filtered/searched rows into the (single) data source so paginator
    // and sort stay attached across filter changes, and reset to the first page.
    effect(() => {
      this.dataSource.data = this.filteredRows();
      this.dataSource.paginator?.firstPage();
    }, { allowSignalWrites: true });
  }

  private getNumericPValue(int: any): number {
    if (typeof int.p_value === 'number') return int.p_value;
    if (typeof int.p_value === 'string') {
      const parsed = parseFloat(int.p_value.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
    return 0.21;
  }

  private getNumericMscor(int: any): number {
    if (typeof int.mscor === 'number') return int.mscor;
    if (typeof int.mscor === 'string') {
      const parsed = parseFloat(int.mscor.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
    return 0.0;
  }

  private isVirtual(int: any): boolean {
    return !!(
      int.isVirtual ||
      int.mscor === '< 0.2' ||
      int.mscor === '<0.1' ||
      int.p_value === '> 0.2' ||
      int.sponge_run?.sponge_run_ID === 0
    );
  }

  // Compute data limits
  pValueLimits = computed(() => {
    const interactions = this.interactions$() || [];
    if (interactions.length === 0) return { min: 0, max: 1, step: 0.001 };
    const pValues = interactions.map(i => this.getNumericPValue(i)).filter(v => !isNaN(v) && isFinite(v));
    const min = pValues.length > 0 ? Math.min(...pValues) : 0;
    const max = pValues.length > 0 ? Math.max(...pValues) : 1;
    const minPositive = Math.min(...pValues.filter(v => v > 0));
    const step = isFinite(minPositive) && minPositive > 0
      ? Math.pow(10, Math.floor(Math.log10(minPositive))) / 10
      : 0.001;
    return { min, max, step };
  });

  mscorLimits = computed(() => {
    const interactions = this.interactions$() || [];
    if (interactions.length === 0) return { min: 0, max: 1, step: 0.001 };
    const mscors = interactions.map(i => this.getNumericMscor(i)).filter(v => !isNaN(v) && isFinite(v));
    const min = mscors.length > 0 ? Math.min(...mscors) : 0;
    const max = mscors.length > 0 ? Math.max(...mscors) : 1;
    return { min, max, step: 0.001 };
  });

  private filteredRows = computed(() => {
    const interactions = this.interactions$() || [];
    const minP = this.minPValue();
    const maxP = this.maxPValue();
    const minM = this.minMscor();
    const maxM = this.maxMscor();
    const pLimits = this.pValueLimits();
    const mLimits = this.mscorLimits();
    const search = this.searchText().trim().toLowerCase();

    const isAtDefaultBounds =
      minP <= pLimits.min &&
      maxP >= pLimits.max &&
      minM <= mLimits.min &&
      maxM >= mLimits.max;

    const filteredInteractions = interactions.filter(interaction => {
      const isVirt = this.isVirtual(interaction);
      if (isVirt) {
        // Default cutoffs exclude nothing; making cutoffs stricter excludes fallback edges first.
        return isAtDefaultBounds;
      }
      const pValue = this.getNumericPValue(interaction);
      const mscor = this.getNumericMscor(interaction);
      return pValue >= minP && pValue <= maxP && mscor >= minM && mscor <= maxM;
    });

    const rows = filteredInteractions.map((interaction) => {
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
        isVirtual: this.isVirtual(interaction),
        interaction,
      };
    });

    if (!search) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.name_1?.toLowerCase().includes(search) ||
        row.name_2?.toLowerCase().includes(search)
    );
  });
  protected readonly capitalize = capitalize;

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openMiRNADialog(interaction: GeneInteraction | TranscriptInteraction) {
    const disease = this.disease$();
    if (!disease) {
      throw new Error('Disease is required');
    }
    this.modalsService.openMiRNADialog(interaction, disease);
  }

  openDialog(entity: Gene | Transcript) {
    this.modalsService.openNodeDialog(entity);
  }

  downloadCSV() {
    exportToCSV(this.dataSource.data, 'interactions_table');
  }
}
