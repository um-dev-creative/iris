import { TestBed } from '@angular/core/testing';
import { AppButtonComponent } from './button.component';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AppButtonComponent);
  Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  return { fixture, button: fixture.nativeElement.querySelector('button') as HTMLButtonElement };
}

describe('AppButtonComponent', () => {
  it('es un botón primario md de tipo button por defecto', () => {
    const { button } = render();

    expect(button.type).toBe('button');
    expect(button.disabled).toBe(false);
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('px-4 py-2');
    expect(button.className).not.toContain('w-full');
  });

  it.each([
    ['primary', 'bg-primary'],
    ['secondary', 'bg-secondary'],
    ['danger', 'bg-destructive'],
    ['ghost', 'bg-transparent'],
  ])('variante %s', (variant, cls) => {
    expect(render({ variant }).button.className).toContain(cls);
  });

  it.each([
    ['sm', 'px-3 py-1.5'],
    ['md', 'px-4 py-2'],
    ['lg', 'px-6 py-3'],
  ])('tamaño %s', (size, cls) => {
    expect(render({ size }).button.className).toContain(cls);
  });

  it('admite ancho completo, deshabilitado y type submit', () => {
    const { button } = render({ fullWidth: true, disabled: true, type: 'submit' });

    expect(button.className).toContain('w-full');
    expect(button.disabled).toBe(true);
    expect(button.type).toBe('submit');
  });

  it('proyecta su contenido', () => {
    const fixture = TestBed.createComponent(AppButtonComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });
});
