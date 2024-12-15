import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SunburstComponent } from './sunburst.component';

describe('SunburstComponent', () => {
  let component: SunburstComponent;
  let fixture: ComponentFixture<SunburstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SunburstComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SunburstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
