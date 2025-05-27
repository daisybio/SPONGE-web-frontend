import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GseaPlotComponent } from './gsea-plot.component';

describe('GseaPlotComponent', () => {
  let component: GseaPlotComponent;
  let fixture: ComponentFixture<GseaPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GseaPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GseaPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
