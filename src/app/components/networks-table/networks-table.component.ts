import { Component, computed, inject, input, resource } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { BackendService } from '../../services/backend.service';
import { VersionsService } from '../../services/versions.service';
import { getDiseaseDisplayName, sortDiseaseObjects } from '../../cancer-colors';

/** One disease network (SPONGE run) an entity is part of, with its metrics there */
export interface NetworkRow {
  /** The row's sponge_run.dataset, which carries no subtype */
  dataset: { dataset_ID: number; disease_name: string };
  values: (number | string | null | undefined)[];
}

/**
 * An entity's metrics in every disease network it is part of, used by the gene, transcript and
 * interaction modals. Rows are sorted like the disease dropdowns; the network the modal was opened
 * from is highlighted.
 */
@Component({
  selector: 'app-networks-table',
  imports: [MatProgressSpinner],
  template: `
    @if (loading()) {
      <div class="card-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else if (sortedRows().length === 0) {
      <p class="empty">{{ emptyText() }}</p>
    } @else {
      <table class="networks-table">
        <thead>
          <tr>
            <th>Disease</th>
            @for (column of columns(); track column) {
              <th>{{ column }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of sortedRows(); track $index) {
            <tr [class.current]="row.dataset.dataset_ID === currentDatasetID()">
              <td>{{ row.label }}</td>
              @for (value of row.values; track $index) {
                <td>{{ format(value) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .networks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    th, td {
      text-align: left;
      padding: 6px 12px 6px 0;
      border-bottom: 1px solid #eee;
    }
    th {
      font-weight: 600;
    }
    tr.current td {
      background: var(--app-accent-container);
      color: var(--app-accent-on-container);
      font-weight: 600;
    }
    .empty {
      color: #757575;
    }
  `],
})
export class NetworksTableComponent {
  private readonly backend = inject(BackendService);
  private readonly version$ = inject(VersionsService).versionReadOnly();

  rows = input.required<NetworkRow[]>();
  columns = input.required<string[]>();
  /** Dataset of the network the modal was opened from */
  currentDatasetID = input<number | undefined>();
  loading = input(false);
  emptyText = input('Not part of any disease network.');

  // For the subtypes, which the rows don't carry
  private readonly datasets$ = resource({
    params: this.version$,
    loader: ({ params: version }) => this.backend.getDatasets(version),
  });

  readonly sortedRows = computed(() => {
    const subtypes = new Map(
      (this.datasets$.value() ?? []).map((dataset) => [dataset.dataset_ID, dataset.disease_subtype])
    );
    const rows = this.rows().map((row) => {
      const subtype = subtypes.get(row.dataset.dataset_ID) ?? null;
      return {
        ...row,
        disease_name: row.dataset.disease_name,
        label:
          getDiseaseDisplayName(row.dataset.disease_name) +
          (subtype ? ' – ' + getDiseaseDisplayName(subtype) : ''),
        subtype,
      };
    });
    // The main dataset before its subtypes; sortDiseaseObjects' stable sort keeps that order
    rows.sort((a, b) => (a.subtype ?? '').localeCompare(b.subtype ?? ''));
    return sortDiseaseObjects(rows);
  });

  format(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string') return value;
    if (isNaN(value)) return 'N/A';
    if (Number.isInteger(value)) return value.toLocaleString();
    const abs = Math.abs(value);
    if (abs < 0.001 || abs >= 10000) return value.toExponential(4);
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
}
