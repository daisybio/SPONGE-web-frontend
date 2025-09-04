import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseViewsComponent } from './browse-views.component';

describe('BrowseViewsComponent', () => {
  let component: BrowseViewsComponent;
  let fixture: ComponentFixture<BrowseViewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseViewsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowseViewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
