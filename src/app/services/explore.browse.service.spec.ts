import { TestBed } from '@angular/core/testing';

import { ExploreBrowseService } from './explore.browse.service';

describe('ExploreBrowseService', () => {
  let service: ExploreBrowseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExploreBrowseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
