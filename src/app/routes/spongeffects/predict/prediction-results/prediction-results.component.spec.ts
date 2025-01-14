import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictionResultsComponent } from './prediction-results.component';

describe('PredictionResultsComponent', () => {
  let component: PredictionResultsComponent;
  let fixture: ComponentFixture<PredictionResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictionResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
