import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { DashboardStore, NotificationService } from '../core/services';

function render() {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(LayoutComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, store: TestBed.inject(DashboardStore) };
}

describe('LayoutComponent', () => {
  it('compone barra lateral, barra superior, contenido y avisos', () => {
    const { el } = render();

    expect(el.querySelector('app-sidebar')).not.toBeNull();
    expect(el.querySelector('app-navbar')).not.toBeNull();
    expect(el.querySelector('main router-outlet')).not.toBeNull();
    expect(el.querySelector('app-notification')).not.toBeNull();
  });

  it('la barra de carga sigue al estado de carga', () => {
    const { fixture, el, store } = render();
    expect(el.querySelector('.animate-pulse')).toBeNull();

    store.setLoading(true);
    fixture.detectChanges();

    expect(el.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('el margen del contenido sigue a la barra lateral', () => {
    const { fixture, el, store } = render();
    const content = () => el.querySelector('.flex.flex-col.flex-1') as HTMLElement;
    expect(content().className).toContain('lg:ml-64');

    store.setSidebarOpen(false);
    fixture.detectChanges();

    expect(content().className).toContain('lg:ml-16');
  });

  it('los avisos del servicio llegan al contenedor de toasts', () => {
    vi.useFakeTimers();
    const { fixture, el } = render();

    TestBed.inject(NotificationService).error('Fallo', 'detalle');
    fixture.detectChanges();

    expect(el.querySelector('app-notification')!.textContent).toContain('Fallo');
    vi.useRealTimers();
  });
});
