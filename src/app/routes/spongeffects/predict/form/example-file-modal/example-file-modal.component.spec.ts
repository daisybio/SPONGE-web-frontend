import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExampleFileModalComponent } from './example-file-modal.component';

describe('ExampleFileModalComponent', () => {
  let component: ExampleFileModalComponent;
  let fixture: ComponentFixture<ExampleFileModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleFileModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExampleFileModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
