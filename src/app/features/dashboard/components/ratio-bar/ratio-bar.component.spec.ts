import { TestBed } from '@angular/core/testing';
import { RatioBarComponent, RatioSegment } from './ratio-bar.component';

function render(segments: RatioSegment[], total: number | null = null) {
  const fixture = TestBed.createComponent(RatioBarComponent);
  fixture.componentRef.setInput('segments', segments);
  fixture.componentRef.setInput('total', total);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const parts = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="ratio-part"]'));

describe('RatioBarComponent', () => {
  it('cada tramo ocupa su parte de la suma y lo dice en el texto accesible', () => {
    const el = render([{ label: 'Enviados', value: 3, color: 'red' }, { label: 'Fallidos', value: 1, color: 'blue' }]);

    expect(parts(el).map((p) => p.style.width)).toEqual(['75%', '25%']);
    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Enviados: 3 (75.0 %), Fallidos: 1 (25.0 %)');
  });

  it('con un total mayor deja hueco', () => {
    const el = render([{ label: 'Causa', value: 2, color: 'red' }], 8);

    expect(parts(el)[0].style.width).toBe('25%');
  });

  it('sin datos dice «Sin datos»', () => {
    const el = render([{ label: 'Enviados', value: 0, color: 'red' }]);

    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Sin datos');
    expect(parts(el)[0].style.width).toBe('0%');
  });
});
