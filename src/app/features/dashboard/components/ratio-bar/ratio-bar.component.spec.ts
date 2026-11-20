import { TestBed } from '@angular/core/testing';
import { RatioBarComponent, RatioSegment } from './ratio-bar.component';

function render(segments: RatioSegment[], total: number | null = null, variant: 'thin' | 'tall' = 'thin') {
  const fixture = TestBed.createComponent(RatioBarComponent);
  fixture.componentRef.setInput('segments', segments);
  fixture.componentRef.setInput('total', total);
  fixture.componentRef.setInput('variant', variant);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const parts = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="ratio-part"]'));

describe('RatioBarComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cada tramo ocupa su parte de la suma y lo dice en el texto accesible', () => {
    const { el } = render([{ label: 'Enviados', value: 3, color: 'red' }, { label: 'Fallidos', value: 1, color: 'blue' }]);

    expect(parts(el).map((p) => p.style.width)).toEqual(['75%', '25%']);
    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Enviados: 3 (75.0 %), Fallidos: 1 (25.0 %)');
  });

  it('un tramo en cero no dibuja nada', () => {
    const { el } = render([{ label: 'Enviados', value: 3, color: 'red' }, { label: 'Fallidos', value: 0, color: 'blue' }]);

    expect(parts(el)).toHaveLength(1);
  });

  it('con un total mayor deja una pista gris para lo que falta', () => {
    const { fixture, el } = render([{ label: 'Causa', value: 2, color: 'red' }], 8);

    expect(parts(el)[0].style.width).toBe('25%');
    expect(fixture.componentInstance.gapPercent()).toBe(75);
  });

  it('sin datos dice «Sin datos»', () => {
    const { el } = render([{ label: 'Enviados', value: 0, color: 'red' }]);

    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Sin datos');
    expect(parts(el)).toHaveLength(0);
    expect(render([], 10).el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Sin datos');
  });

  it('la alta escribe el porcentaje dentro solo de los bloques donde cabe', () => {
    let callback: ResizeObserverCallback = () => undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) { callback = cb; }
      observe() { /* measured by hand below */ }
      disconnect() { /* nothing to release */ }
    });
    const { fixture, el } = render([{ label: 'Confirmados', value: 90, color: 'blue' }, { label: 'Vencidos', value: 10, color: 'red' }], null, 'tall');
    expect(el.querySelectorAll('[data-testid="ratio-label"]')).toHaveLength(0);

    callback([{ contentRect: { width: 400 } } as ResizeObserverEntry], {} as ResizeObserver);
    fixture.detectChanges();
    const labels = Array.from(el.querySelectorAll('[data-testid="ratio-label"]')).map((l) => l.textContent);
    expect(labels).toEqual(['90 %']);
    expect(el.querySelector('[role="img"]')?.getAttribute('style')).toContain('height: 28px');
  });
});
