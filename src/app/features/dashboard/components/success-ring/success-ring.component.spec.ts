import { TestBed } from '@angular/core/testing';
import { SuccessRingComponent } from './success-ring.component';

function render(rate: number | null) {
  const fixture = TestBed.createComponent(SuccessRingComponent);
  fixture.componentRef.setInput('rate', rate);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SuccessRingComponent', () => {
  it('sin tasa no dibuja arco y dice «Sin datos»', () => {
    const el = render(null);

    expect(el.querySelectorAll('circle')).toHaveLength(1);
    expect(el.textContent).toContain('Sin datos');
  });

  it('con tasa dibuja el arco proporcional', () => {
    const el = render(0.5);

    expect(el.querySelectorAll('circle')).toHaveLength(2);
    expect(el.textContent).toContain('50.0 %');
    const [filled] = el.querySelectorAll('circle')[1].getAttribute('stroke-dasharray')!.split(' ').map(Number);
    expect(filled).toBeCloseTo(Math.PI * 52, 1);
  });

  it('una tasa fuera de rango no desborda el anillo', () => {
    const el = render(1.7);

    const [filled, rest] = el.querySelectorAll('circle')[1].getAttribute('stroke-dasharray')!.split(' ').map(Number);
    expect(filled).toBeCloseTo(2 * Math.PI * 52, 1);
    expect(rest).toBeCloseTo(0, 1);
  });

  it('el color sigue a la tasa: verde, ámbar o rojo', () => {
    const color = (rate: number) => render(rate).querySelectorAll('circle')[1].getAttribute('stroke');

    expect(color(0.99)).toBe('var(--success)');
    expect(color(0.85)).toBe('var(--warning)');
    expect(color(0.5)).toBe('var(--destructive)');
  });

  it('dice de cuántos intentos sale la tasa', () => {
    const fixture = TestBed.createComponent(SuccessRingComponent);
    fixture.componentRef.setInput('rate', 0.9);
    fixture.componentRef.setInput('sent', 90);
    fixture.componentRef.setInput('failed', 10);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="ring-detail"]')?.textContent).toContain('90 de 100 entregados');
  });
});
