import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractionModalComponent } from './interaction-modal.component';

describe('InteractionModalComponent', () => {
  let component: InteractionModalComponent;
  let fixture: ComponentFixture<InteractionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InteractionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
