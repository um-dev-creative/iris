import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CampaignsService } from './campaigns.service';
import { API_BASE_URL } from '../../../core/config';
import { Campaign, CreateCampaignRequest } from '../../../core/models';

const URL = '/test/api/v1/campaigns';
const older: Campaign = { id: 'a', name: 'Antigua', channelType: 'email', status: 'DRAFT', createdAt: '2026-01-01 10:00:00' };
const newer: Campaign = { id: 'b', name: 'Nueva', channelType: 'email', status: 'SCHEDULED', createdAt: '2026-02-01 10:00:00' };

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  return { service: TestBed.inject(CampaignsService), http: TestBed.inject(HttpTestingController) };
}

async function loaded() {
  const ctx = setup();
  const done = ctx.service.load();
  ctx.http.expectOne(URL).flush([older, newer]);
  await done;
  return ctx;
}

describe('CampaignsService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('carga la lista con las más recientes primero y apaga loading', async () => {
    const { service, http } = setup();

    const done = service.load();
    expect(service.loading()).toBe(true);
    http.expectOne(URL).flush([older, newer]);
    await done;

    expect(service.campaigns().map((c) => c.id)).toEqual(['b', 'a']);
    expect(service.loading()).toBe(false);
  });

  it('si la carga falla conserva la lista anterior, apaga loading y rechaza', async () => {
    const { service, http } = await loaded();

    const failing = service.load();
    http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });

    await expect(failing).rejects.toBeTruthy();
    expect(service.campaigns()).toHaveLength(2);
    expect(service.loading()).toBe(false);
  });

  it('tolera campañas sin fecha al ordenar', async () => {
    const { service, http } = setup();
    const done = service.load();
    http.expectOne(URL).flush([{ ...older, createdAt: null }, newer]);
    await done;

    expect(service.campaigns().map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('get, progress y channelTypes piden su ruta', async () => {
    const { service, http } = setup();

    const one = service.get('x y');
    http.expectOne(`${URL}/x%20y`).flush(older);
    expect((await one).id).toBe('a');

    const progress = service.progress('a');
    http.expectOne(`${URL}/a/progress`).flush({ campaignId: 'a', totalRecipients: 4, totalSent: 2, delivered: 1, failed: 0, pending: 2 });
    expect((await progress).totalSent).toBe(2);

    const channels = service.channelTypes();
    http.expectOne(`${URL}/channel-types`).flush([{ code: 'email', name: 'Email' }]);
    expect((await channels)[0].code).toBe('email');
  });

  it('create envía el cuerpo con POST', async () => {
    const { service, http } = setup();
    const request: CreateCampaignRequest = {
      name: 'N', channelTypeCode: 'email', templateId: 't', userId: 'u', recipients: [{ identifier: 'a@x.co' }], status: 'DRAFT',
    };

    const done = service.create(request);
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ campaignId: 'c', name: 'N', status: 'DRAFT', totalRecipients: 1, createdAt: 'x' });

    expect((await done).campaignId).toBe('c');
  });

  it('update reemplaza la fila de la lista', async () => {
    const { service, http } = await loaded();

    const done = service.update('a', { name: 'Renombrada' });
    const req = http.expectOne(`${URL}/a`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...older, name: 'Renombrada' });
    await done;

    expect(service.campaigns().find((c) => c.id === 'a')?.name).toBe('Renombrada');
  });

  it('setEnabled hace PATCH con enabled y actualiza la fila', async () => {
    const { service, http } = await loaded();

    const done = service.setEnabled('a', false);
    const req = http.expectOne((r) => r.url === `${URL}/a/toggle`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('enabled')).toBe('false');
    req.flush(null);
    await done;

    expect(service.campaigns().find((c) => c.id === 'a')?.enabled).toBe(false);
    expect(service.campaigns().find((c) => c.id === 'b')?.enabled).toBeUndefined();
  });

  it('remove borra y quita la fila', async () => {
    const { service, http } = await loaded();

    const done = service.remove('a');
    const req = http.expectOne(`${URL}/a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await done;

    expect(service.campaigns().map((c) => c.id)).toEqual(['b']);
  });

  it('si borrar falla, la fila se queda', async () => {
    const { service, http } = await loaded();

    const done = service.remove('a');
    http.expectOne(`${URL}/a`).flush({}, { status: 403, statusText: 'Forbidden' });

    await expect(done).rejects.toBeTruthy();
    expect(service.campaigns()).toHaveLength(2);
  });
});
