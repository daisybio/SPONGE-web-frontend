import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReusableHeatmapComponent } from './heatmap-plot.component';

describe('ReusableHeatmapComponent', () => {
  let component: ReusableHeatmapComponent;
  let fixture: ComponentFixture<ReusableHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReusableHeatmapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReusableHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
