import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnrichmentClassPlotComponent } from './enrichment-class-plot.component';

describe('EnrichmentClassPlotComponent', () => {
  let component: EnrichmentClassPlotComponent;
  let fixture: ComponentFixture<EnrichmentClassPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrichmentClassPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnrichmentClassPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
