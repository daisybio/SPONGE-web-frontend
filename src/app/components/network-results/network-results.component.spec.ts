import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkResultsComponent } from './network-results.component';

describe('NetworkResultsComponent', () => {
  let component: NetworkResultsComponent;
  let fixture: ComponentFixture<NetworkResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NetworkResultsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
