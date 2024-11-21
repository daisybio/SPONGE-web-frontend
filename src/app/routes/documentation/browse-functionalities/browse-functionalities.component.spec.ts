import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseFunctionalitiesComponent } from './browse-functionalities.component';

describe('BrowseFunctionalitiesComponent', () => {
  let component: BrowseFunctionalitiesComponent;
  let fixture: ComponentFixture<BrowseFunctionalitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseFunctionalitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowseFunctionalitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
