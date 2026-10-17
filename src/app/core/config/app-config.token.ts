import { InjectionToken } from '@angular/core';

/**
 * Configuración de la aplicación que cambia por entorno. Se inyecta con `APP_CONFIG`; para agregar una variable
 * se declara aquí (con su valor por defecto en `DEFAULT_APP_CONFIG`) y se define en `environment*.ts`.
 */
export interface AppConfig {
  /** `true` en el build de producción. */
  production: boolean;
  /** Raíz de la API, relativa al BFF (p. ej. `/mrc/api/v1`). */
  apiBaseUrl: string;
  /** Intervalo de refresco de datos en vivo, en milisegundos (lo usan las fases con datos reales). */
  pollingIntervalMs: number;
  features: {
    /** Usa datos simulados en lugar de la API. */
    mockData: boolean;
    /** Muestra la página de showcase de componentes. */
    showcase: boolean;
  };
}

/** Valores de respaldo para lo que un entorno no defina. */
export const DEFAULT_APP_CONFIG: AppConfig = {
  production: false,
  apiBaseUrl: '/mrc/api/v1',
  pollingIntervalMs: 30_000,
  features: { mockData: true, showcase: true },
};

/** Configuración completa de la aplicación. La registra `provideAppConfig()`. */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

/**
 * Raíz de la API. Por defecto sale de `APP_CONFIG`; una prueba (o un entorno especial) puede reemplazarla con
 * `{ provide: API_BASE_URL, useValue: '...' }`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
