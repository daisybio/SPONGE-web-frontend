import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiseaseSelectorComponent } from './disease-selector.component';

describe('DiseaseSelectorComponent', () => {
  let component: DiseaseSelectorComponent;
  let fixture: ComponentFixture<DiseaseSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiseaseSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiseaseSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
