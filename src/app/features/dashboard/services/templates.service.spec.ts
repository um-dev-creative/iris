import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TemplatesService } from './templates.service';
import { API_BASE_URL } from '../../../core/config';

const URL = '/test/api/v1/general/templates';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  return { service: TestBed.inject(TemplatesService), http: TestBed.inject(HttpTestingController) };
}

describe('TemplatesService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('carga las aplicaciones ordenadas por nombre y apaga loading', async () => {
    const { service, http } = setup();
    const done = service.loadApplications();
    expect(service.loading()).toBe(true);
    http.expectOne(`${URL}/applications`).flush([
      { id: 'b', name: 'zerobound', codeName: 'zb' },
      { id: 'a', name: 'Iris', codeName: 'iris' },
    ]);
    await done;
    expect(service.applications().map((a) => a.name)).toEqual(['Iris', 'zerobound']);
    expect(service.loading()).toBe(false);
  });

  it('si la carga falla conserva la lista, apaga loading y rechaza', async () => {
    const { service, http } = setup();
    const first = service.loadApplications();
    http.expectOne(`${URL}/applications`).flush([{ id: 'a', name: 'Iris', codeName: 'iris' }]);
    await first;
    const failing = service.loadApplications();
    http.expectOne(`${URL}/applications`).flush({}, { status: 403, statusText: 'Forbidden' });
    await expect(failing).rejects.toBeTruthy();
    expect(service.applications()).toHaveLength(1);
    expect(service.loading()).toBe(false);
  });

  it('lee y cambia la carpeta de una aplicación', async () => {
    const { service, http } = setup();
    const read = service.folder('app/1');
    http.expectOne(`${URL}/applications/app%2F1/folder`).flush({ applicationId: 'app/1', folder: 'iris', registered: true });
    expect((await read).folder).toBe('iris');

    const put = service.assignFolder('a', 'nueva');
    const req = http.expectOne(`${URL}/applications/a/folder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ folder: 'nueva' });
    req.flush({ applicationId: 'a', folder: 'nueva', registered: true });
    expect((await put).folder).toBe('nueva');
  });

  it('lee los catálogos de tipos y severidades', async () => {
    const { service, http } = setup();
    const types = service.templateTypes();
    http.expectOne(`${URL}/types`).flush([{ id: 't', name: 'Email' }]);
    const severities = service.severities();
    http.expectOne(`${URL}/severities`).flush([{ id: 's', name: 'INFO' }]);
    expect((await types)[0].name).toBe('Email');
    expect((await severities)[0].name).toBe('INFO');
  });

  it('busca plantillas de la aplicación con el texto, solo si lo hay', async () => {
    const { service, http } = setup();
    const withQuery = service.search('a', ' hola ');
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('applicationId')).toBe('a');
    expect(req.request.params.get('q')).toBe('hola');
    expect(req.request.params.get('size')).toBe('50');
    req.flush({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
    await withQuery;

    const without = service.search('a');
    const plain = http.expectOne((r) => r.url === URL);
    expect(plain.request.params.has('q')).toBe(false);
    plain.flush({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
    await without;
  });

  it('crea una plantilla y lee su contenido', async () => {
    const { service, http } = setup();
    const created = service.create({ description: 'd', location: 'x.ftl', fileFormat: 'ftl', templateTypeId: 't', applicationId: 'a', severityTypeId: 's' });
    const post = http.expectOne(URL);
    expect(post.request.method).toBe('POST');
    post.flush({ id: 'n' });
    expect((await created).id).toBe('n');

    const read = service.content('n');
    http.expectOne(`${URL}/n/content`).flush({ templateId: 'n', content: 'hola', etag: 'e1', exists: true });
    expect((await read).etag).toBe('e1');
  });

  it('guarda con If-Match, crea con If-None-Match y confirma las del sistema', async () => {
    const { service, http } = setup();
    const update = service.saveContent('n', 'x', 'e1', false);
    const put = http.expectOne(`${URL}/n/content`);
    expect(put.request.headers.get('If-Match')).toBe('"e1"');
    expect(put.request.params.has('confirmSystem')).toBe(false);
    put.flush({ etag: 'e2' });
    await update;

    const create = service.saveContent('n', 'x', null, true);
    const first = http.expectOne((r) => r.url === `${URL}/n/content`);
    expect(first.request.headers.get('If-None-Match')).toBe('*');
    expect(first.request.params.get('confirmSystem')).toBe('true');
    first.flush({ etag: 'e3' });
    await create;
  });

  it('pide la vista previa con el contenido sin guardar', async () => {
    const { service, http } = setup();
    const preview = service.preview('a', 'x.ftl', 'hola ${n}', { n: 1 });
    const req = http.expectOne(`${URL}/preview`);
    expect(req.request.body).toEqual({ applicationId: 'a', name: 'x.ftl', content: 'hola ${n}', params: { n: 1 } });
    req.flush({ ok: true, format: 'ftl', output: 'hola 1', problems: [], parameters: ['n'] });
    expect((await preview).output).toBe('hola 1');

    const defaults = service.preview('a', 'x.ftl', 'c');
    http.expectOne(`${URL}/preview`).flush({ ok: true, format: 'ftl', output: 'c', problems: [], parameters: [] });
    await defaults;
  });
});
