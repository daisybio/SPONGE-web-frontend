import { TestBed } from '@angular/core/testing';
import { InfoService } from './info.service';
import { ElementRef } from '@angular/core';

describe('EquationService', () => {
  let service: InfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should render mscor equation', () => {
    const elementRef = new ElementRef(document.createElement('span'));
    service.renderMscorEquation(elementRef);
    expect(elementRef.nativeElement.innerHTML).toContain('mscor(g_1, g_2, M)');
  });
});