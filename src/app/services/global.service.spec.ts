import { TestBed } from '@angular/core/testing';
import { GlobalService } from './global.service';
import { Dataset } from '../interfaces';

describe('GlobalService', () => {
  let service: GlobalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial values', () => {
    expect(service.selectedDataset$()).toBeUndefined();
    expect(service.selectedLevel$()).toBe('gene');
  });

  it('should update selectedDataset$ when setDataset is called', () => {
    const mockDataset: Dataset = {
      disease_name: 'test disease',
      dataset_ID: 123,
      sample_count: 100,
      disease_subtype: 'test subtype',
      count: 1
    } as any;

    service.setDataset(mockDataset);
    expect(service.selectedDataset$()).toEqual(mockDataset);
  });

  it('should update selectedLevel$ when setLevel is called', () => {
    service.setLevel('transcript');
    expect(service.selectedLevel$()).toBe('transcript');
    
    service.setLevel('gene');
    expect(service.selectedLevel$()).toBe('gene');
  });
});
