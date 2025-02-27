import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenesComponent } from './genes.component';

describe('GenesComponent', () => {
  let component: GenesComponent;
  let fixture: ComponentFixture<GenesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
