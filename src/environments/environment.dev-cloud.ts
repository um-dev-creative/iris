// Entorno "dev-cloud" (ver docs/technical/environments.md). Se sustituye por fileReplacements en angular.json.
// Solo valores públicos: nada de claves ni secretos. La API se consume por el BFF con URL relativa.
export const environment = {
  production: false,
  apiBaseUrl: '/mrc/api/v1',
};
