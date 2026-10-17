import { TestBed } from '@angular/core/testing';
import { Send } from 'lucide-angular';
import { KpiCardComponent } from './kpi-card.component';
import { KpiCard } from '../../../../core/models';

const base: KpiCard = { title: 'Mensajes', value: '1,284', icon: Send, color: 'primary' };

function render(data: KpiCard) {
  const fixture = TestBed.createComponent(KpiCardComponent);
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('KpiCardComponent', () => {
  it('pinta título y valor; sin cambio no muestra tendencia', () => {
    const el = render(base);

    expect(el.textContent).toContain('Mensajes');
    expect(el.textContent).toContain('1,284');
    expect(el.textContent).not.toContain('%');
  });

  it('un cambio positivo se pinta en verde con su etiqueta', () => {
    const el = render({ ...base, change: 12.5, changeLabel: 'vs ayer' });

    expect(el.textContent).toContain('12.5%');
    expect(el.textContent).toContain('vs ayer');
    expect(el.querySelector('.text-success')).not.toBeNull();
  });

  it('un cambio negativo se pinta en rojo con el valor absoluto', () => {
    const el = render({ ...base, change: -8.2 });

    expect(el.textContent).toContain('8.2%');
    expect(el.textContent).not.toContain('-8.2');
    expect(el.querySelector('.text-destructive')).not.toBeNull();
  });

  it('un cambio de cero cuenta como positivo', () => {
    expect(render({ ...base, change: 0 }).querySelector('.text-success')).not.toBeNull();
  });
});
