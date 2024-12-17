import {ComponentFixture, TestBed} from '@angular/core/testing';

import {TranscriptModalComponent} from './transcript-modal.component';

describe('GeneModalComponent', () => {
  let component: TranscriptModalComponent;
  let fixture: ComponentFixture<TranscriptModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptModalComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TranscriptModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
