import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DiseaseSimilarityComponent} from './disease-similarity.component';

describe('DiseaseDistancesComponent', () => {
  let component: DiseaseSimilarityComponent;
  let fixture: ComponentFixture<DiseaseSimilarityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiseaseSimilarityComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DiseaseSimilarityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
