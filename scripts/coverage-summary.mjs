// Lee coverage/{frontend,server}/lcov.info y escribe una tabla Markdown (líneas, funciones, ramas) para el resumen del job de CI.
import { existsSync, readFileSync } from 'node:fs';

const projects = [
  ['Frontend (`src/app`)', 'coverage/frontend/lcov.info'],
  ['BFF (`server/`)', 'coverage/server/lcov.info'],
];
const THRESHOLD = 85;

function totals(lcov) {
  const sum = { LF: 0, LH: 0, FNF: 0, FNH: 0, BRF: 0, BRH: 0 };
  for (const line of lcov.split('\n')) {
    const [key, value] = line.split(':');
    if (key in sum) sum[key] += Number(value);
  }
  return sum;
}
const pct = (hit, found) => (found === 0 ? 100 : (hit / found) * 100);
const cell = (value) => `${value.toFixed(1)} % ${value >= THRESHOLD ? '✅' : '❌'}`;

console.log('## Cobertura\n');
console.log(`| Proyecto | Líneas | Funciones | Ramas |\n|---|---:|---:|---:|`);
for (const [name, file] of projects) {
  if (!existsSync(file)) {
    console.log(`| ${name} | sin datos | sin datos | sin datos |`);
    continue;
  }
  const t = totals(readFileSync(file, 'utf8'));
  console.log(`| ${name} | ${cell(pct(t.LH, t.LF))} | ${cell(pct(t.FNH, t.FNF))} | ${cell(pct(t.BRH, t.BRF))} |`);
}
console.log(`\nUmbral mínimo: ${THRESHOLD} %.`);
