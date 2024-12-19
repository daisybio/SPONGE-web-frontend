import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LollipopPlotComponent } from './lollipop-plot.component';

describe('LollipopPlotComponent', () => {
  let component: LollipopPlotComponent;
  let fixture: ComponentFixture<LollipopPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LollipopPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LollipopPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
