import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleTableComponent } from './module-table.component';

describe('ModuleTableComponent', () => {
  let component: ModuleTableComponent;
  let fixture: ComponentFixture<ModuleTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
