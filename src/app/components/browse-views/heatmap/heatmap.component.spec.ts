import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneExpressionHeatmapComponent } from './heatmap.component';

describe('GeneExpressionHeatmapComponent', () => {
  let component: GeneExpressionHeatmapComponent;
  let fixture: ComponentFixture<GeneExpressionHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneExpressionHeatmapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneExpressionHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
