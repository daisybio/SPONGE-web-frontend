import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GSEAComponent } from './gsea.component';

describe('GSEAComponent', () => {
  let component: GSEAComponent;
  let fixture: ComponentFixture<GSEAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GSEAComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GSEAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
