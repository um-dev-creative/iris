import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors';
import { provideAppConfig } from './core/config';
import { AuthService } from './core/services';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppConfig(),
    // al arrancar en el navegador se averigua si ya hay sesión; el servidor (SSR) usa app.config.server.ts y no la pregunta
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
  ],
};
