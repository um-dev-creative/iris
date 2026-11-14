'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const api = '/mrc/api/v1/templates';
const last = () => bff.state.apiCalls.at(-1);

beforeAll(async () => {
  bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris-client', BACKBONE_CLIENT_SECRET: 'not-a-real-secret' } });
});
afterAll(() => bff.stop());
beforeEach(() => {
  bff.state.apiCalls.length = 0;
  Object.assign(bff.state, { apiStatus: 200, apiBody: [{ id: 'x' }], monitoring: undefined });
});

describe('templates (listas de referencia)', () => {
  it('exige sesión', async () => {
    assert.equal((await bff.call(`${api}/types`)).status, 401);
  });

  it.each([['types'], ['severities']])('lista %s con el Bearer de la aplicación y la sesión', async (name) => {
    const res = await bff.call(`${api}/${name}`, { cookie: SESSION });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ id: 'x' }]);
    assert.equal(last().url, `/mercury/api/v1/templates/${name}`);
    assert.equal(last().token, tokens.GOOD);
    assert.match(last().authorization, /^Bearer m2m-/);
  });

  it('las plantillas utilizables van siempre con la aplicación del BFF, aunque el navegador mande otra', async () => {
    await bff.call(`${api}/defined?applicationId=other-app&extra=1`, { cookie: SESSION });

    assert.equal(last().url, '/mercury/api/v1/templates/defined?applicationId=app-1');
  });

  it('no deja la respuesta en caché', async () => {
    assert.equal((await bff.call(`${api}/types`, { cookie: SESSION })).headers.get('cache-control'), 'no-store');
  });

  it('devuelve tal cual el 403 de Mercury', async () => {
    bff.state.apiStatus = 403;
    bff.state.apiBody = { message: 'no' };

    assert.equal((await bff.call(`${api}/defined`, { cookie: SESSION })).status, 403);
  });

  it('rechaza un id que no es UUID sin llamar a Mercury', async () => {
    const res = await bff.call(`${api}/anything`, { cookie: SESSION });

    assert.equal(res.status, 400);
    assert.equal(bff.state.apiCalls.length, 0);
  });

  describe('por aplicación', () => {
    const APP = '8249aa97-23fa-47cd-9c6d-4685f0c03cc3';

    it('lista las aplicaciones que la persona puede gestionar, según Mercury, con el Bearer de la aplicación y la sesión', async () => {
      const res = await bff.call(`${api}/applications`, { cookie: SESSION });

      assert.equal(res.status, 200);
      assert.equal(last().service, 'mercury');
      assert.equal(last().url, '/mercury/api/v1/templates/applications');
      assert.equal(last().token, tokens.GOOD);
      assert.match(last().authorization, /^Bearer m2m-/);
    });

    it('las aplicaciones exigen sesión', async () => {
      assert.equal((await bff.call(`${api}/applications`)).status, 401);
    });

    it('busca las plantillas de la aplicación de la URL, no la del BFF ni la del navegador', async () => {
      await bff.call(`${api}/applications/${APP}?q=welcome&page=1&applicationId=other&evil=1`, { cookie: SESSION });

      const url = new URL(last().url, 'http://x');
      assert.equal(url.pathname, '/mercury/api/v1/templates');
      assert.deepEqual(url.searchParams.getAll('applicationId'), [APP]);
      assert.equal(url.searchParams.get('q'), 'welcome');
      assert.equal(url.searchParams.get('evil'), null);
      assert.match(last().authorization, /^Bearer m2m-/);
      assert.equal(last().token, tokens.GOOD);
    });

    it('crea en la aplicación de la URL y descarta campos ajenos', async () => {
      bff.state.apiStatus = 201;
      await bff.call(`${api}/applications/${APP}`, {
        method: 'POST', cookie: SESSION,
        body: { description: 'Bienvenida', location: 'bienvenida.md', fileFormat: 'MD', templateTypeId: 't', severityTypeId: 's', applicationId: 'other', active: false },
      });

      assert.equal(last().method, 'POST');
      assert.equal(last().body.applicationId, APP);
      assert.equal(last().body.active, undefined);
    });

    it('deja pasar el asunto del correo al crear y al editar', async () => {
      bff.state.apiStatus = 201;
      await bff.call(`${api}/applications/${APP}`, {
        method: 'POST', cookie: SESSION,
        body: { description: 'Bienvenida', location: 'bienvenida.md', fileFormat: 'MD', templateTypeId: 't', severityTypeId: 's', subject: 'Hola ${name}' },
      });
      assert.equal(last().body.subject, 'Hola ${name}');

      bff.state.apiStatus = 200;
      await bff.call(`${api}/${'11111111-1111-4111-8111-111111111111'}`, { method: 'PUT', cookie: SESSION, body: { subject: '' } });
      assert.equal(last().body.subject, '');
    });

    it('rechaza una ubicación que no es un archivo al crear', async () => {
      const res = await bff.call(`${api}/applications/${APP}`, { method: 'POST', cookie: SESSION, body: { description: 'x', location: 'a/b.ftl' } });

      assert.equal(res.status, 400);
      assert.equal(bff.state.apiCalls.length, 0);
    });

    it('la vista previa va con la aplicación de la URL', async () => {
      await bff.call(`${api}/applications/${APP}/preview`, { method: 'POST', cookie: SESSION, body: { name: 'a.md', content: 'x', params: {}, applicationId: 'other' } });

      assert.equal(last().url, '/mercury/api/v1/templates/preview');
      assert.equal(last().body.applicationId, APP);
    });

    it('rechaza una aplicación que no es UUID sin llamar a nadie', async () => {
      assert.equal((await bff.call(`${api}/applications/not-a-uuid`, { cookie: SESSION })).status, 400);
      assert.equal(bff.state.apiCalls.length, 0);
    });
  });

  describe('plantillas', () => {
    const ID = '00000000-0000-0000-0000-0000000000b1';

    it('busca con la aplicación del BFF y solo los filtros permitidos', async () => {
      await bff.call(`${api}?q=welcome&page=2&size=10&sort=createdAt,desc&applicationId=other&evil=1`, { cookie: SESSION });

      const url = new URL(last().url, 'http://x');
      assert.equal(url.pathname, '/mercury/api/v1/templates');
      assert.equal(url.searchParams.get('applicationId'), 'app-1');
      assert.equal(url.searchParams.get('q'), 'welcome');
      assert.equal(url.searchParams.get('page'), '2');
      assert.equal(url.searchParams.get('sort'), 'createdAt,desc');
      assert.equal(url.searchParams.get('evil'), null);
      assert.equal(url.searchParams.getAll('applicationId').length, 1);
    });

    it('crea con la aplicación del BFF y descarta campos ajenos', async () => {
      bff.state.apiStatus = 201;
      const res = await bff.call(api, {
        method: 'POST', cookie: SESSION,
        body: { description: 'Bienvenida', location: 'bienvenida.md', fileFormat: 'MD', templateTypeId: 't', severityTypeId: 's', applicationId: 'other', active: false },
      });

      assert.equal(res.status, 201);
      assert.equal(last().method, 'POST');
      assert.equal(last().body.applicationId, 'app-1');
      assert.equal(last().body.active, undefined);
      assert.equal(last().body.location, 'bienvenida.md');
    });

    it.each([['../etc/passwd'], ['a/b.ftl'], ['sin-extension'], ['x.exe'], ['s3://bucket/a.html'], ['.oculto.ftl']])('rechaza la ubicación %s al crear y al editar', async (location) => {
      const created = await bff.call(api, { method: 'POST', cookie: SESSION, body: { description: 'x', location } });
      const updated = await bff.call(`${api}/${ID}`, { method: 'PUT', cookie: SESSION, body: { location } });

      assert.equal(created.status, 400);
      assert.equal(updated.status, 400);
      assert.equal(bff.state.apiCalls.length, 0);
    });

    it('edita sin poder cambiar la aplicación', async () => {
      await bff.call(`${api}/${ID}`, { method: 'PUT', cookie: SESSION, body: { description: 'Nueva', applicationId: 'other' } });

      assert.equal(last().method, 'PUT');
      assert.deepEqual(last().body, { description: 'Nueva' });
    });

    it('lee, desactiva y lee el contenido', async () => {
      await bff.call(`${api}/${ID}`, { cookie: SESSION });
      assert.equal(last().url, `/mercury/api/v1/templates/${ID}`);

      bff.state.apiStatus = 204;
      await bff.call(`${api}/${ID}`, { method: 'DELETE', cookie: SESSION });
      assert.equal(last().method, 'DELETE');

      bff.state.apiStatus = 200;
      await bff.call(`${api}/${ID}/content`, { cookie: SESSION });
      assert.equal(last().url, `/mercury/api/v1/templates/${ID}/content`);
    });

    it('guarda el contenido pasando If-Match y devolviendo el ETag', async () => {
      bff.state.apiHeaders = { ETag: '"abc"' };
      const res = await bff.call(`${api}/${ID}/content`, { method: 'PUT', cookie: SESSION, headers: { 'If-Match': '"old"' }, body: { content: 'Hola', other: 'x' } });

      assert.equal(res.headers.get('etag'), '"abc"');
      assert.equal(last().ifMatch, '"old"');
      assert.deepEqual(last().body, { content: 'Hola' });
      bff.state.apiHeaders = {};
    });

    it('crea el archivo con If-None-Match: *', async () => {
      await bff.call(`${api}/${ID}/content`, { method: 'PUT', cookie: SESSION, headers: { 'If-None-Match': '*' }, body: { content: 'Hola' } });

      assert.equal(last().ifNoneMatch, '*');
    });

    it('pasa confirmSystem al guardar y rechaza otros valores', async () => {
      await bff.call(`${api}/${ID}/content?confirmSystem=true&evil=1`, { method: 'PUT', cookie: SESSION, headers: { 'If-Match': '"a"' }, body: { content: 'x' } });
      assert.equal(last().url, `/mercury/api/v1/templates/${ID}/content?confirmSystem=true`);

      bff.state.apiCalls.length = 0;
      const bad = await bff.call(`${api}/${ID}/content?confirmSystem=maybe`, { method: 'PUT', cookie: SESSION, body: { content: 'x' } });
      assert.equal(bad.status, 400);
      assert.equal(bff.state.apiCalls.length, 0);
    });

    it('lista y lee las versiones', async () => {
      await bff.call(`${api}/${ID}/versions`, { cookie: SESSION });
      assert.equal(last().url, `/mercury/api/v1/templates/${ID}/versions`);

      await bff.call(`${api}/${ID}/versions/3`, { cookie: SESSION });
      assert.equal(last().url, `/mercury/api/v1/templates/${ID}/versions/3`);
    });

    it.each([['0'], ['-1'], ['abc'], ['1.5'], ['1234567890']])('rechaza la versión %s sin llamar a Mercury', async (version) => {
      const res = await bff.call(`${api}/${ID}/versions/${version}`, { cookie: SESSION });

      assert.equal(res.status, 400);
      assert.equal(bff.state.apiCalls.length, 0);
    });

    it('restaura una versión pasando If-Match y confirmSystem', async () => {
      bff.state.apiHeaders = { ETag: '"nuevo"' };
      const res = await bff.call(`${api}/${ID}/versions/2/restore?confirmSystem=true`, { method: 'POST', cookie: SESSION, headers: { 'If-Match': '"actual"' } });

      assert.equal(res.headers.get('etag'), '"nuevo"');
      assert.equal(last().method, 'POST');
      assert.equal(last().url, `/mercury/api/v1/templates/${ID}/versions/2/restore?confirmSystem=true`);
      assert.equal(last().ifMatch, '"actual"');
      bff.state.apiHeaders = {};
    });

    it('rechaza un confirmSystem inválido al restaurar', async () => {
      const res = await bff.call(`${api}/${ID}/versions/2/restore?confirmSystem=x`, { method: 'POST', cookie: SESSION });

      assert.equal(res.status, 400);
    });

    it('la vista previa lleva la aplicación del BFF y solo nombre, contenido y parámetros', async () => {
      await bff.call(`${api}/preview`, { method: 'POST', cookie: SESSION, body: { name: 'a.md', content: '# Hola', params: { a: 1 }, applicationId: 'other', x: 1 } });

      assert.equal(last().url, '/mercury/api/v1/templates/preview');
      assert.deepEqual(last().body, { name: 'a.md', content: '# Hola', params: { a: 1 }, applicationId: 'app-1' });
    });

    it('devuelve tal cual el 412, el 422 y el 428 de Mercury', async () => {
      for (const status of [412, 422, 428]) {
        bff.state.apiStatus = status;
        bff.state.apiBody = { problems: [] };
        const res = await bff.call(`${api}/${ID}/content`, { method: 'PUT', cookie: SESSION, body: { content: 'x' } });
        assert.equal(res.status, status);
      }
    });

    it('exige la cabecera CSRF en las escrituras', async () => {
      const res = await bff.call(`${api}/${ID}/content`, { method: 'PUT', cookie: SESSION, csrf: false, body: { content: 'x' } });

      assert.equal(res.status, 403);
    });
  });
});
