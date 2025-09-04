import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleImportanceScatterplotComponent } from './module-table.component';

describe('ModuleImportanceScatterplotComponent', () => {
  let component: ModuleImportanceScatterplotComponent;
  let fixture: ComponentFixture<ModuleImportanceScatterplotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleImportanceScatterplotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleImportanceScatterplotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
