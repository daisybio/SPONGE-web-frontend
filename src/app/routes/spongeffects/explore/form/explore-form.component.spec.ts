import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ExploreFormComponent} from './explore-form.component';

describe('FormComponent', () => {
  let component: ExploreFormComponent;
  let fixture: ComponentFixture<ExploreFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreFormComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ExploreFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
