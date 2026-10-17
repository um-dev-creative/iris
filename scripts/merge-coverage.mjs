// Une coverage/frontend/lcov.info y coverage/server/lcov.info en coverage/lcov.info (para reportes y CI).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const parts = ['coverage/frontend/lcov.info', 'coverage/server/lcov.info'];
const missing = parts.filter((p) => !existsSync(p));
if (missing.length > 0) {
  console.error(`Faltan reportes: ${missing.join(', ')}. Ejecuta primero pnpm test:all`);
  process.exit(1);
}
mkdirSync('coverage', { recursive: true });
writeFileSync('coverage/lcov.info', parts.map((p) => readFileSync(p, 'utf8')).join('\n'));
console.log('coverage/lcov.info generado');
