import { TestBed } from '@angular/core/testing';

import { PredictService } from './predict.service';

describe('PredictServiceService', () => {
  let service: PredictService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
