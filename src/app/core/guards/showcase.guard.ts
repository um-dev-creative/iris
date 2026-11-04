import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { APP_CONFIG } from '../config';
import { ROUTE_PATHS, routeUrl } from '../routes';

/** The showcase exists only where `features.showcase` is on (every environment but production by default). */
export const showcaseGuard: CanMatchFn = () =>
  inject(APP_CONFIG).features.showcase || inject(Router).createUrlTree([routeUrl(ROUTE_PATHS.DASHBOARD)]);
