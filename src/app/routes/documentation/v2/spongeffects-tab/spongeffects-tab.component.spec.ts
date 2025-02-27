import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpongeffectsTabComponent } from './spongeffects-tab.component';

describe('SpongeffectsTabComponent', () => {
  let component: SpongeffectsTabComponent;
  let fixture: ComponentFixture<SpongeffectsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpongeffectsTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpongeffectsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
