import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleHeatmapComponent } from './module-heatmap.component';

describe('ModuleHeatmapComponent', () => {
  let component: ModuleHeatmapComponent;
  let fixture: ComponentFixture<ModuleHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleHeatmapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
