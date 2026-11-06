import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TemplateApplicationsPageComponent } from './template-applications-page.component';
import { httpError } from '../../testing/campaigns.testing';
import { fakeTemplates } from '../../testing/templates.testing';
import { ApplicationSummary } from '../../../../core/models';

const APPS: ApplicationSummary[] = [
  { id: 'z', name: 'ZeroBound', codeName: 'zerobound', description: 'Finanzas', active: true },
  { id: 'i', name: 'Iris', codeName: 'iris', active: true },
  { id: 'x', name: 'Vieja', active: false },
  { id: 'n', name: 'Nula', active: null },
];

async function render(setup?: (fake: ReturnType<typeof fakeTemplates>) => void) {
  const fake = fakeTemplates();
  fake.service.applications.mockResolvedValue(APPS);
  setup?.(fake);
  TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider] });
  const fixture = TestBed.createComponent(TemplateApplicationsPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, fake };
}

const cards = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-testid="application"]')) as HTMLAnchorElement[];

describe('TemplateApplicationsPageComponent', () => {
  it('muestra las aplicaciones activas por nombre, cada una con su enlace a sus plantillas', async () => {
    const { el } = await render();

    expect(cards(el).map((c) => c.getAttribute('href'))).toEqual(['/dashboard/templates/i', '/dashboard/templates/n', '/dashboard/templates/z']);
    expect(cards(el)[0].textContent).toContain('Iris');
    expect(cards(el)[0].textContent).toContain('iris');
    expect(cards(el)[2].textContent).toContain('Finanzas');
    expect(el.textContent).not.toContain('Vieja');
  });

  it('sin aplicaciones lo dice', async () => {
    const { el } = await render((fake) => fake.service.applications.mockResolvedValue([]));

    expect(el.querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  it.each([[403, 'No tienes permiso'], [500, 'No se pudieron cargar']])('si la carga falla con %s lo explica y deja reintentar', async (status, text) => {
    const { el, fake, fixture } = await render((f) => f.service.applications.mockRejectedValue(httpError(status)));

    expect(el.querySelector('[data-testid="load-failed"]')?.textContent).toContain(text);
    fake.service.applications.mockResolvedValue(APPS);
    (el.querySelector('[data-testid="load-failed"] button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(cards(el)).toHaveLength(3);
  });

  it('Actualizar vuelve a pedir las aplicaciones', async () => {
    const { component, fake } = await render();
    fake.service.applications.mockClear();

    await component.reload();

    expect(fake.service.applications).toHaveBeenCalledTimes(1);
  });
});
