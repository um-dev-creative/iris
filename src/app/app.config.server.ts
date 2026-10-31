import { ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor, httpErrorInterceptor } from './core/interceptors';
import { provideAppConfig } from './core/config';

export const config: ApplicationConfig = {
  providers: [
    provideAppConfig(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, httpErrorInterceptor])),
    provideServerRendering(),
  ],
};

