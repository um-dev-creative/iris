import { environment as development } from './environment';
import { environment as dev } from './environment.dev';
import { environment as devCloud } from './environment.dev-cloud';
import { environment as qa } from './environment.qa';
import { environment as qaCloud } from './environment.qa-cloud';
import { environment as production } from './environment.prod';
import { buildAppConfig } from '../app/core/config';

const ENVIRONMENTS = { development, dev, qa, 'dev-cloud': devCloud, 'qa-cloud': qaCloud, production };

describe.each(Object.entries(ENVIRONMENTS))('entorno %s', (_name, env) => {
  it('consume la API por el BFF con URL relativa', () => {
    expect(env.apiBaseUrl).toMatch(/^\/mrc\/api\/v1$/);
  });

  it('no incluye claves, secretos ni referencias a servicios de prueba', () => {
    const text = JSON.stringify(env).toLowerCase();

    expect(Object.keys(env).filter((key) => /key|secret|token|password/i.test(key))).toEqual([]);
    expect(text).not.toContain('jsonplaceholder');
    expect(text).not.toMatch(/https?:\/\//);
  });

  it('es una configuración válida de la aplicación', () => {
    expect(buildAppConfig(env).apiBaseUrl).toBe(env.apiBaseUrl);
  });
});

describe('production', () => {
  it('es el único entorno con production = true', () => {
    const flagged = Object.entries(ENVIRONMENTS).filter(([, env]) => env.production).map(([name]) => name);

    expect(flagged).toEqual(['production']);
  });
});
