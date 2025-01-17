import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExampleScriptComponent } from './example-script.component';

describe('ExampleScriptComponent', () => {
  let component: ExampleScriptComponent;
  let fixture: ComponentFixture<ExampleScriptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleScriptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExampleScriptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
