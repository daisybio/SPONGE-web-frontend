import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GSEAresultsComponent } from './gsearesults.component';

describe('GSEAresultsComponent', () => {
  let component: GSEAresultsComponent;
  let fixture: ComponentFixture<GSEAresultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GSEAresultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GSEAresultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
