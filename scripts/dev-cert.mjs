// Certificado autofirmado de localhost para `ng serve` y el BFF. Solo desarrollo: se genera si falta o caducó, y nunca
// entra a git. En Docker y Kubernetes el TLS lo termina el proxy de enfrente.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const CERT = 'ssl/localhost.crt';
const KEY = 'ssl/localhost.key';
const DAYS = '825'; // el máximo que aceptan los navegadores de Apple

const openssl = (...args) => spawnSync('openssl', args, { stdio: 'ignore' });

const valid = existsSync(CERT) && existsSync(KEY) && openssl('x509', '-in', CERT, '-noout', '-checkend', '86400').status === 0;

if (!valid) {
  mkdirSync('ssl', { recursive: true });
  const result = openssl(
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', DAYS,
    '-keyout', KEY, '-out', CERT,
    '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-addext', 'extendedKeyUsage=serverAuth',
  );
  if (result.status !== 0) {
    console.error(`No se pudo generar ${CERT}: instala openssl.`);
    process.exit(1);
  }
  console.log(`Certificado de desarrollo creado en ${CERT}`);
}
