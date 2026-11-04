import { TestBed } from '@angular/core/testing';
import { AppLogoComponent } from './logo.component';

const render = (inputs: Record<string, unknown> = {}) => {
  const fixture = TestBed.createComponent(AppLogoComponent);
  Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

describe('AppLogoComponent', () => {
  it('es decorativo y mide 24 por defecto', () => {
    const svg = render().querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
  });

  it('acepta otro tamaño', () => {
    expect(render({ size: 56 }).querySelector('svg')!.getAttribute('width')).toBe('56');
  });

  it('solo gira si se pide', () => {
    expect(render().querySelector('.iris-sweep--on')).toBeNull();
    expect(render({ animated: true }).querySelector('.iris-sweep--on')).not.toBeNull();
  });
});
