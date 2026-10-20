import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { DashboardStore } from '../../core/services';
import { fakeAuth } from '../../core/testing/auth.testing';

function setWidth(width: number) {
  vi.stubGlobal('innerWidth', width);
}

function render() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), fakeAuth().provider] });
  const fixture = TestBed.createComponent(SidebarComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, store: TestBed.inject(DashboardStore) };
}

describe('SidebarComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    setWidth(1280);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('abierta: muestra la marca y las etiquetas de los cuatro enlaces', () => {
    const { el } = render();

    expect(el.textContent).toContain('Iris');
    ['Overview', 'Data View', 'Settings', 'Showcase'].forEach((label) => expect(el.textContent).toContain(label));
    expect(el.querySelectorAll('nav a')).toHaveLength(4);
    expect(el.querySelector('aside')!.className).toContain('w-64');
  });

  it('los enlaces apuntan a las rutas del dashboard', () => {
    const { el } = render();

    const hrefs = Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/dashboard', '/dashboard/data', '/dashboard/settings', '/dashboard/showcase']);
  });

  it('colapsada: oculta las etiquetas y se estrecha', () => {
    const { fixture, el, store } = render();

    (el.querySelector('[aria-label="Toggle sidebar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(store.sidebarOpen()).toBe(false);
    expect(el.textContent).not.toContain('Overview');
    expect(el.querySelector('aside')!.className).toContain('w-16');
  });

  it('en escritorio no hay telón ni se oculta al colapsar', () => {
    const { fixture, store } = render();
    store.setSidebarOpen(false);
    fixture.detectChanges();

    expect(fixture.componentInstance.isMobileHidden).toBe(false);
    expect(fixture.componentInstance.isMobileVisible).toBe(false);
  });

  it('en móvil abierta muestra el telón y al pulsarlo se cierra', () => {
    setWidth(500);
    const { fixture, el, store } = render();
    expect(fixture.componentInstance.isMobileVisible).toBe(true);

    (el.querySelector('.fixed.inset-0') as HTMLElement).click();
    fixture.detectChanges();

    expect(store.sidebarOpen()).toBe(false);
    expect(fixture.componentInstance.isMobileHidden).toBe(true);
    expect(el.querySelector('aside')!.className).toContain('-translate-x-full');
  });
});
