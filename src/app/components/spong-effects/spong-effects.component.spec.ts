import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpongEffectsComponent } from './spong-effects.component';

describe('SpongEffectsComponent', () => {
  let component: SpongEffectsComponent;
  let fixture: ComponentFixture<SpongEffectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SpongEffectsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpongEffectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
