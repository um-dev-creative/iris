export { APP_CONFIG, API_BASE_URL, DEFAULT_APP_CONFIG } from './app-config.token';
export type { AppConfig } from './app-config.token';
export { provideAppConfig, buildAppConfig } from './provide-app-config';
export type { AppEnvironment } from './provide-app-config';
export { BFF_CSRF_HEADER, BFF_CSRF_VALUE, isAuthUrl, isBffUrl } from './bff';
