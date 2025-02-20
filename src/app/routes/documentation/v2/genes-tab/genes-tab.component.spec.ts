import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenesTabComponent } from './genes-tab.component';

describe('GenesTabComponent', () => {
  let component: GenesTabComponent;
  let fixture: ComponentFixture<GenesTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenesTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenesTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
