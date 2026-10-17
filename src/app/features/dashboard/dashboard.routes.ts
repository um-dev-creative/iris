import { Routes } from '@angular/router';
import { ROUTE_PATHS } from '../../core/routes';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: ROUTE_PATHS.ROOT,
    loadComponent: () =>
      import('./pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent
      ),
  },
  {
    path: ROUTE_PATHS.DATA,
    loadComponent: () =>
      import('./pages/data-view-page/data-view-page.component').then(
        (m) => m.DataViewPageComponent
      ),
  },
  {
    path: ROUTE_PATHS.SETTINGS,
    loadComponent: () =>
      import('./pages/settings-page/settings-page.component').then(
        (m) => m.SettingsPageComponent
      ),
  },
  {
    path: ROUTE_PATHS.SHOWCASE,
    loadComponent: () =>
      import('./pages/showcase-page/showcase-page.component').then(
        (m) => m.ShowcasePageComponent
      ),
  },
];
