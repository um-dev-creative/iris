import { TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { DashboardStore } from '../../core/services';

function render(title?: string) {
  localStorage.clear();
  const fixture = TestBed.createComponent(NavbarComponent);
  if (title) fixture.componentRef.setInput('pageTitle', title);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, store: TestBed.inject(DashboardStore) };
}

describe('NavbarComponent', () => {
  it('muestra el título por defecto o el indicado', () => {
    expect(render().el.querySelector('h1')!.textContent).toContain('Dashboard');
    TestBed.resetTestingModule();
    expect(render('Ajustes').el.querySelector('h1')!.textContent).toContain('Ajustes');
  });

  it('sin usuario muestra "?" y sin contador de avisos', () => {
    const { el } = render();

    expect(el.textContent).toContain('?');
    expect(el.querySelector('.bg-destructive')).toBeNull();
  });

  it('con usuario muestra iniciales y nombre', () => {
    const { fixture, el, store } = render();

    store.setUser({ id: 1, name: 'Luis Mata', username: 'l', email: 'l@m' });
    fixture.detectChanges();

    expect(el.textContent).toContain('LM');
    expect(el.textContent).toContain('Luis Mata');
  });

  it('el contador de avisos aparece, se topa en 9+ y la campana los marca como leídos', () => {
    const { fixture, el, store } = render();
    for (let i = 0; i < 3; i++) store.addNotification({ type: 'info', message: `n${i}` });
    fixture.detectChanges();
    expect(el.querySelector('.bg-destructive')!.textContent!.trim()).toBe('3');

    for (let i = 0; i < 10; i++) store.addNotification({ type: 'info', message: `m${i}` });
    fixture.detectChanges();
    expect(el.querySelector('.bg-destructive')!.textContent!.trim()).toBe('9+');

    (el.querySelector('[aria-label="Notifications"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(store.unreadCount()).toBe(0);
    expect(el.querySelector('.bg-destructive')).toBeNull();
  });

  it('el botón de menú alterna la barra lateral', () => {
    const { el, store } = render();

    (el.querySelector('[aria-label="Toggle menu"]') as HTMLButtonElement).click();

    expect(store.sidebarOpen()).toBe(false);
  });
});
