import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractionsTableComponent } from './interactions-table.component';

describe('InteractionsTableComponent', () => {
  let component: InteractionsTableComponent;
  let fixture: ComponentFixture<InteractionsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractionsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InteractionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
