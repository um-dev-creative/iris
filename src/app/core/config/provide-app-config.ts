import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../../environments/environment';
import { API_BASE_URL, APP_CONFIG, AppConfig, DEFAULT_APP_CONFIG } from './app-config.token';

/** Lo que un entorno puede definir: cualquier clave de `AppConfig`, `features` incluido, de forma parcial. */
export type AppEnvironment = Partial<Omit<AppConfig, 'features'>> & { features?: Partial<AppConfig['features']> };

/** Mezcla un entorno sobre los valores por defecto. */
export function buildAppConfig(env: AppEnvironment): AppConfig {
  return { ...DEFAULT_APP_CONFIG, ...env, features: { ...DEFAULT_APP_CONFIG.features, ...env.features } };
}

/**
 * Registra `APP_CONFIG` y `API_BASE_URL`. Es el único sitio de `src/app` que lee `environments/environment`;
 * el resto de la aplicación inyecta los tokens.
 *
 * @param env entorno a usar (por defecto el del build; las pruebas pasan uno propio)
 */
export function provideAppConfig(env: AppEnvironment = environment): EnvironmentProviders {
  const providers: Provider[] = [
    { provide: APP_CONFIG, useValue: buildAppConfig(env) },
    { provide: API_BASE_URL, useFactory: (config: AppConfig) => config.apiBaseUrl, deps: [APP_CONFIG] },
  ];
  return makeEnvironmentProviders(providers);
}
