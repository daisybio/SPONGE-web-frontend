import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportancePlotComponent } from './lollipop-plot.component';

describe('ImportancePlotComponent', () => {
  let component: ImportancePlotComponent;
  let fixture: ComponentFixture<ImportancePlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportancePlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportancePlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
