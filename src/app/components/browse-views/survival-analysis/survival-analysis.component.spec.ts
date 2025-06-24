import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurvivalAnalysisComponent } from './survival-analysis.component';

describe('SurvivalAnalysisComponent', () => {
  let component: SurvivalAnalysisComponent;
  let fixture: ComponentFixture<SurvivalAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurvivalAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SurvivalAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
