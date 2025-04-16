import { AfterViewInit, Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { PredictService } from '../../service/predict.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { MatSort, MatSortModule } from '@angular/material/sort';
import {MatInputModule} from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-prediction-table',
  imports: [
    MatPaginatorModule,
    MatTableModule,
    CommonModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './prediction-table.component.html',
  styleUrl: './prediction-table.component.scss'
})
export class PredictionTableComponent implements AfterViewInit {
  predictService = inject(PredictService);
  prediction$ = this.predictService.prediction$;
  predictionResource = this.predictService._prediction$;

  dataSource = new MatTableDataSource<any>([]);
  
  // this.prediction$()?.data || [])
  columnNames: { [key: string]: string } = {
    sampleID: 'Sample ID',
    typePrediction: 'Cancer type prediction',
    subtypePrediction: 'Cancer subtype prediction'
  };

  displayedColumns: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(){
    effect(() => {
      const data = this.prediction$()?.data || [];
      this.dataSource.data = data;

      if (this.dataSource.data.length > 0 ) {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      }
    });

    effect(() => {
      this.predictService._subtypes$;
      if (this.predictService._subtypes$()) {
        this.displayedColumns = ['sampleID', 'typePrediction', 'subtypePrediction'];
      } else {
        this.displayedColumns = ['sampleID', 'typePrediction'];
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator!.firstPage();
    }
  }

}
