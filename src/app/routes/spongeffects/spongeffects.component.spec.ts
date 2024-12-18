import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpongEffectsComponent } from './spongeffects.component';

describe('SpongEffectsComponent', () => {
  let component: SpongEffectsComponent;
  let fixture: ComponentFixture<SpongEffectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpongEffectsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpongEffectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
