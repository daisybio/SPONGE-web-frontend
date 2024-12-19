import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiseaseDistancesComponent } from './disease-distances.component';

describe('DiseaseDistancesComponent', () => {
  let component: DiseaseDistancesComponent;
  let fixture: ComponentFixture<DiseaseDistancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiseaseDistancesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiseaseDistancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
