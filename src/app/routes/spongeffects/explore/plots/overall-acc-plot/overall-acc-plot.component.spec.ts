import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverallAccPlotComponent } from './overall-acc-plot.component';

describe('OverallAccPlotComponent', () => {
  let component: OverallAccPlotComponent;
  let fixture: ComponentFixture<OverallAccPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverallAccPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverallAccPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
