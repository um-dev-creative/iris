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

  it('saveContent envía confirmSystem solo cuando se confirma', async () => {
    const { service, http } = setup();

    const plain = service.saveContent('n', 'x', 'abc');
    const first = http.expectOne((r) => r.url === `${URL}/n/content`);
    expect(first.request.params.has('confirmSystem')).toBe(false);
    first.flush({ templateId: 'n', content: 'x', etag: 'e' });
    await plain;

    const confirmed = service.saveContent('n', 'x', 'abc', true);
    const second = http.expectOne((r) => r.url === `${URL}/n/content`);
    expect(second.request.params.get('confirmSystem')).toBe('true');
    second.flush({ templateId: 'n', content: 'x', etag: 'e' });
    await confirmed;
  });

  it('versions y version piden su ruta', async () => {
    const { service, http } = setup();

    const list = service.versions('n');
    http.expectOne(`${URL}/n/versions`).flush([{ version: 2 }]);
    expect(await list).toHaveLength(1);

    const one = service.version('n', 2);
    http.expectOne(`${URL}/n/versions/2`).flush({ version: 2, content: 'abc' });
    expect((await one).content).toBe('abc');
  });

  it('restore hace POST con If-Match y, si se confirma, confirmSystem', async () => {
    const { service, http } = setup();

    const plain = service.restore('n', 2, 'abc');
    const first = http.expectOne((r) => r.url === `${URL}/n/versions/2/restore`);
    expect(first.request.method).toBe('POST');
    expect(first.request.headers.get('If-Match')).toBe('"abc"');
    expect(first.request.params.has('confirmSystem')).toBe(false);
    first.flush({ templateId: 'n', content: 'viejo', etag: 'e2' });
    expect((await plain).etag).toBe('e2');

    const confirmed = service.restore('n', 2, 'abc', true);
    const second = http.expectOne((r) => r.url === `${URL}/n/versions/2/restore`);
    expect(second.request.params.get('confirmSystem')).toBe('true');
    second.flush({ templateId: 'n', content: 'viejo', etag: 'e3' });
    await confirmed;
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

  describe('por aplicación', () => {
    const APP = '8249aa97-23fa-47cd-9c6d-4685f0c03cc3';

    it('applications lista las aplicaciones', async () => {
      const { service, http } = setup();

      const done = service.applications();
      http.expectOne(`${URL}/applications`).flush([{ id: APP, name: 'Iris' }]);

      expect(await done).toEqual([{ id: APP, name: 'Iris' }]);
    });

    it('search con aplicación usa su ruta y no la envía como parámetro', async () => {
      const { service, http } = setup();

      const done = service.search({ applicationId: APP, q: 'hola', page: 0 });
      const req = http.expectOne((r) => r.url === `${URL}/applications/${APP}`);
      expect(req.request.params.get('q')).toBe('hola');
      expect(req.request.params.has('applicationId')).toBe(false);
      req.flush({ items: [], page: 0, size: 10, totalElements: 0, totalPages: 1 });
      await done;
    });

    it('create con aplicación hace POST a su ruta', async () => {
      const { service, http } = setup();

      const done = service.create({ description: 'd', location: 'a.md', fileFormat: 'MD', templateTypeId: 't', severityTypeId: 's' }, APP);
      const req = http.expectOne(`${URL}/applications/${APP}`);
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'n' });
      await done;
    });

    it('preview con aplicación usa la ruta de la aplicación', async () => {
      const { service, http } = setup();

      const done = service.preview('a.md', 'x', {}, APP);
      http.expectOne(`${URL}/applications/${APP}/preview`).flush({ ok: true, format: 'MARKDOWN', output: '', problems: [], parameters: [] });
      await done;
    });
  });
});

