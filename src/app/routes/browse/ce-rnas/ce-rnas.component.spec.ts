import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CeRNAsComponent } from './ce-rnas.component';

describe('CeRNAsComponent', () => {
  let component: CeRNAsComponent;
  let fixture: ComponentFixture<CeRNAsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CeRNAsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CeRNAsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
