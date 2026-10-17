import { TestBed } from '@angular/core/testing';
import { AppCardComponent } from './card.component';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AppCardComponent);
  Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AppCardComponent', () => {
  it('sin título no pinta cabecera', () => {
    expect(render().querySelector('h3')).toBeNull();
  });

  it('pinta título y subtítulo', () => {
    const el = render({ title: 'Servicios', subtitle: 'Estado actual' });

    expect(el.querySelector('h3')?.textContent).toContain('Servicios');
    expect(el.querySelector('p')?.textContent).toContain('Estado actual');
  });

  it('título sin subtítulo', () => {
    const el = render({ title: 'Solo título' });

    expect(el.querySelector('h3')).not.toBeNull();
    expect(el.querySelector('p')).toBeNull();
  });

  it('aplica relleno salvo con noPadding', () => {
    expect(render().querySelector('.p-6')).not.toBeNull();
    expect(render({ noPadding: true }).querySelector('.p-6')).toBeNull();
  });
});
