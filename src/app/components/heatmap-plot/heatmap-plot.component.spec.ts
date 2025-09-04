import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeatmapPlotComponent } from './heatmap-plot.component';

describe('HeatmapPlotComponent', () => {
  let component: HeatmapPlotComponent;
  let fixture: ComponentFixture<HeatmapPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeatmapPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeatmapPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
