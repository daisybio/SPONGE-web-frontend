import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseTabComponent } from './browse-tab.component';

describe('BrowseTabComponent', () => {
  let component: BrowseTabComponent;
  let fixture: ComponentFixture<BrowseTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowseTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
