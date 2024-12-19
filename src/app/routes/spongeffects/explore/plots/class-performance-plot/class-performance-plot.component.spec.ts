import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassPerformancePlotComponent } from './class-performance-plot.component';

describe('ClassPerformancePlotComponent', () => {
  let component: ClassPerformancePlotComponent;
  let fixture: ComponentFixture<ClassPerformancePlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassPerformancePlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassPerformancePlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
