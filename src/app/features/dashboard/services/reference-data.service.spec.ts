import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReferenceDataService } from './reference-data.service';
import { API_BASE_URL } from '../../../core/config';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  return { service: TestBed.inject(ReferenceDataService), http: TestBed.inject(HttpTestingController) };
}

describe('ReferenceDataService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each([
    ['templateTypes', '/test/api/v1/templates/types'],
    ['severityTypes', '/test/api/v1/templates/severities'],
    ['usableTemplates', '/test/api/v1/templates/defined'],
  ] as const)('%s pide %s', async (method, url) => {
    const { service, http } = setup();

    const done = service[method]();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '1', name: 'x', description: 'x' }]);

    expect(await done).toHaveLength(1);
  });

  it('propaga el error (p. ej. 403) para que el formulario use su campo de texto', async () => {
    const { service, http } = setup();

    const done = service.usableTemplates();
    http.expectOne('/test/api/v1/templates/defined').flush({}, { status: 403, statusText: 'Forbidden' });

    await expect(done).rejects.toBeTruthy();
  });
});
