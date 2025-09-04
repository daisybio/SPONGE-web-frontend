import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KMPlotComponent } from './kmplot.component';

describe('KMPlotComponent', () => {
  let component: KMPlotComponent;
  let fixture: ComponentFixture<KMPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KMPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KMPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
