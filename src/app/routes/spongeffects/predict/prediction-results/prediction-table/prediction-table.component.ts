import { AfterViewInit, Component, computed, effect, inject, ViewChild } from '@angular/core';
import { PredictService } from '../../service/predict.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { PredictFormComponent } from '../../form/predict-form.component';

@Component({
  selector: 'app-prediction-table',
  imports: [
    MatPaginatorModule,
    MatTableModule,
    CommonModule,
    MatSortModule
  ],
  templateUrl: './prediction-table.component.html',
  styleUrl: './prediction-table.component.scss'
})
export class PredictionTableComponent {
  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$;
  predictionResource = this.predictService._prediction$;

  dataSource = computed(() => new MatTableDataSource(this.prediction$()?.data || []));

  columnNames: { [key: string]: string } = {
    sampleID: 'Sample ID',
    typePrediction: 'Cancer type prediction',
    subtypePrediction: 'Cancer subtype prediction'
  };

  displayedColumns: string[] = [];
  subtype_effect = effect(() => {
    console.log('subtype effect')
    this.predictService._subtypes$;
    if (this.predictService._subtypes$()) {
      this.displayedColumns = ['sampleID', 'typePrediction', 'subtypePrediction'];
    } else {
      this.displayedColumns = ['sampleID', 'typePrediction'];
    }
    console.log(this.displayedColumns)
    console.log(this.dataSource())
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  paginator_effect = effect(() => {
    if (this.dataSource().data.length > 0 ) {
      this.dataSource().paginator = this.paginator;
      this.dataSource().sort = this.sort;
    }
  });

}
