import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TemplatesService } from './templates.service';
import { API_BASE_URL } from '../../../core/config';

const URL = '/test/api/v1/templates';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  return { service: TestBed.inject(TemplatesService), http: TestBed.inject(HttpTestingController) };
}

describe('TemplatesService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('busca enviando solo los filtros con valor', async () => {
    const { service, http } = setup();

    const done = service.search({ q: 'hola', page: 0, size: 10, templateTypeId: '', sort: 'createdAt,desc' });
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('q')).toBe('hola');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('sort')).toBe('createdAt,desc');
    expect(req.request.params.has('templateTypeId')).toBe(false);
    req.flush({ items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });

    expect((await done).totalElements).toBe(0);
  });

  it('busca sin filtros', async () => {
    const { service, http } = setup();

    const done = service.search();
    http.expectOne(URL).flush({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });

    expect((await done).items).toEqual([]);
  });

  it('get, create, update y deactivate usan su verbo y su ruta', async () => {
    const { service, http } = setup();
    const input = { description: 'd', location: 'd.md', fileFormat: 'MD', templateTypeId: 't', severityTypeId: 's' };

    const one = service.get('a b');
    http.expectOne(`${URL}/a%20b`).flush({ id: 'a b' });
    await one;

    const created = service.create(input);
    const post = http.expectOne(URL);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(input);
    post.flush({ id: 'n' });
    await created;

    const updated = service.update('n', { description: 'otra' });
    const put = http.expectOne(`${URL}/n`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ description: 'otra' });
    put.flush({ id: 'n' });
    await updated;

    const removed = service.deactivate('n');
    const del = http.expectOne(`${URL}/n`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await removed;
  });

  it('content lee el contenido', async () => {
    const { service, http } = setup();

    const done = service.content('n');
    http.expectOne(`${URL}/n/content`).flush({ templateId: 'n', content: 'x', etag: 'abc' });

    expect((await done).etag).toBe('abc');
  });

  it('saveContent sobre una versión leída envía If-Match con la huella entre comillas', async () => {
    const { service, http } = setup();

    const done = service.saveContent('n', 'nuevo', 'abc');
    const req = http.expectOne(`${URL}/n/content`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('If-Match')).toBe('"abc"');
    expect(req.request.headers.has('If-None-Match')).toBe(false);
    expect(req.request.body).toEqual({ content: 'nuevo' });
    req.flush({ templateId: 'n', content: 'nuevo', etag: 'def' });

    expect((await done).etag).toBe('def');
  });

  it('saveContent sin huella crea el archivo con If-None-Match: *', async () => {
    const { service, http } = setup();

    const done = service.saveContent('n', 'nuevo', null);
    const req = http.expectOne(`${URL}/n/content`);
    expect(req.request.headers.get('If-None-Match')).toBe('*');
    expect(req.request.headers.has('If-Match')).toBe(false);
    req.flush({ templateId: 'n', content: 'nuevo', etag: 'def' });
    await done;
  });

  it('saveContent propaga el 412 y el 422 con su cuerpo', async () => {
    const { service, http } = setup();

    const conflict = service.saveContent('n', 'x', 'abc');
    http.expectOne(`${URL}/n/content`).flush({}, { status: 412, statusText: 'Precondition Failed' });
    await expect(conflict).rejects.toMatchObject({ status: 412 });

    const invalid = service.saveContent('n', '<#if', 'abc');
    http.expectOne(`${URL}/n/content`).flush({ problems: [{ line: 1, column: 1, message: 'x' }] }, { status: 422, statusText: 'Unprocessable' });
    await expect(invalid).rejects.toMatchObject({ status: 422, error: { problems: [{ line: 1 }] } });
  });

  it('preview envía nombre, contenido y parámetros', async () => {
    const { service, http } = setup();

    const done = service.preview('a.md', '# Hola ${n}', { n: 'Ana' });
    const req = http.expectOne(`${URL}/preview`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'a.md', content: '# Hola ${n}', params: { n: 'Ana' } });
    req.flush({ ok: true, format: 'MARKDOWN', output: '<h1>Hola Ana</h1>', problems: [], parameters: ['n'] });

    expect((await done).output).toContain('Ana');
  });
});
