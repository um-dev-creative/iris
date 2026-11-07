import { Routes } from '@angular/router';
import { ROUTE_PATHS } from '../../core/routes';
import { showcaseGuard, unsavedChangesGuard } from '../../core/guards';

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
  // plantillas por aplicación: aplicaciones → sus plantillas → el editor
  {
    path: ROUTE_PATHS.TEMPLATES,
    loadComponent: () =>
      import('./pages/template-applications-page/template-applications-page.component').then((m) => m.TemplateApplicationsPageComponent),
  },
  {
    path: `${ROUTE_PATHS.TEMPLATES}/:applicationId`,
    loadComponent: () =>
      import('./pages/templates-page/templates-page.component').then((m) => m.TemplatesPageComponent),
  },
  {
    path: `${ROUTE_PATHS.TEMPLATES}/:applicationId/${ROUTE_PATHS.NEW}`,
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/template-editor-page/template-editor-page.component').then((m) => m.TemplateEditorPageComponent),
  },
  {
    path: `${ROUTE_PATHS.TEMPLATES}/:applicationId/:id`,
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/template-editor-page/template-editor-page.component').then((m) => m.TemplateEditorPageComponent),
  },
  {
    path: ROUTE_PATHS.CAMPAIGNS,
    loadComponent: () =>
      import('./pages/campaigns-page/campaigns-page.component').then((m) => m.CampaignsPageComponent),
  },
  {
    path: `${ROUTE_PATHS.CAMPAIGNS}/${ROUTE_PATHS.NEW}`,
    loadComponent: () =>
      import('./pages/campaign-form-page/campaign-form-page.component').then((m) => m.CampaignFormPageComponent),
  },
  {
    path: `${ROUTE_PATHS.CAMPAIGNS}/:id/${ROUTE_PATHS.EDIT}`,
    loadComponent: () =>
      import('./pages/campaign-form-page/campaign-form-page.component').then((m) => m.CampaignFormPageComponent),
  },
  {
    path: `${ROUTE_PATHS.CAMPAIGNS}/:id`,
    loadComponent: () =>
      import('./pages/campaign-detail-page/campaign-detail-page.component').then((m) => m.CampaignDetailPageComponent),
  },
  {
    path: ROUTE_PATHS.LOGIN_CLIENTS,
    loadComponent: () =>
      import('./pages/login-clients-page/login-clients-page.component').then(
        (m) => m.LoginClientsPageComponent
      ),
  },
  {
    path: ROUTE_PATHS.USERS,
    loadComponent: () => import('./pages/users-page/users-page.component').then((m) => m.UsersPageComponent),
  },
  {
    path: ROUTE_PATHS.SHOWCASE,
    canMatch: [showcaseGuard],
    loadComponent: () =>
      import('./pages/showcase-page/showcase-page.component').then(
        (m) => m.ShowcasePageComponent
      ),
  },
];
