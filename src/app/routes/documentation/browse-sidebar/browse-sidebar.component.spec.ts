import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseSidebarComponent } from './browse-sidebar.component';

describe('BrowseSidebarComponent', () => {
  let component: BrowseSidebarComponent;
  let fixture: ComponentFixture<BrowseSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowseSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
