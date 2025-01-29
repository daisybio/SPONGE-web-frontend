import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictionTableComponent } from './prediction-table.component';

describe('PredictionTableComponent', () => {
  let component: PredictionTableComponent;
  let fixture: ComponentFixture<PredictionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
