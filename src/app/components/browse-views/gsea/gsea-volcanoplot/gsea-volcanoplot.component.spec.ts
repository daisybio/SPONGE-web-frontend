import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GseaVolcanoplotComponent } from './gsea-volcanoplot.component';

describe('GseaVolcanoplotComponent', () => {
  let component: GseaVolcanoplotComponent;
  let fixture: ComponentFixture<GseaVolcanoplotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GseaVolcanoplotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GseaVolcanoplotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
