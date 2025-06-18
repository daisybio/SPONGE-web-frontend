import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GseaBarplotComponent } from './gsea-barplot.component';

describe('GseaBarplotComponent', () => {
  let component: GseaBarplotComponent;
  let fixture: ComponentFixture<GseaBarplotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GseaBarplotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GseaBarplotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
