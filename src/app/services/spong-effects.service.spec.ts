import { TestBed } from '@angular/core/testing';

import { SpongEffectsService } from './spong-effects.service';

describe('SpongEffectsService', () => {
  let service: SpongEffectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpongEffectsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
