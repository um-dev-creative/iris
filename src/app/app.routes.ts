import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard, guestGuard } from './core/guards';
import { ROUTE_PATHS } from './core/routes';

export const routes: Routes = [
  {
    path: ROUTE_PATHS.ROOT,
    redirectTo: ROUTE_PATHS.DASHBOARD,
    pathMatch: 'full',
  },
  {
    path: ROUTE_PATHS.LOGIN,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: ROUTE_PATHS.DASHBOARD,
    component: LayoutComponent,
    canActivate: [authGuard],
    // navegar entre páginas del dashboard también exige sesión (canActivate solo corre al entrar al padre)
    canActivateChild: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES
      ),
  },
  {
    path: ROUTE_PATHS.WILDCARD,
    redirectTo: ROUTE_PATHS.DASHBOARD,
  },
];
