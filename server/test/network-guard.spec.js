'use strict';

const http = require('node:http');

describe('guardia de red de las pruebas (AC3)', () => {
  it('rechaza una conexión a un host que no es loopback', async () => {
    await expect(
      new Promise((resolve, reject) => {
        const req = http.get({ host: 'example.com', port: 80, path: '/' }, resolve);
        req.on('error', reject);
      }),
    ).rejects.toThrow(/real network connection/);
  });

  it('rechaza resolver nombres externos', () => {
    const dns = require('node:dns');

    expect(() => dns.lookup('mercury.example.org', () => undefined)).toThrow(/real network connection/);
  });

  it('permite el loopback', async () => {
    const server = http.createServer((_req, res) => res.end('ok'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    const body = await new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: server.address().port }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    expect(body).toBe('ok');
    server.close();
  });
});
