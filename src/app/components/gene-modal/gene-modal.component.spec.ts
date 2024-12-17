import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneModalComponent } from './gene-modal.component';

describe('GeneModalComponent', () => {
  let component: GeneModalComponent;
  let fixture: ComponentFixture<GeneModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
