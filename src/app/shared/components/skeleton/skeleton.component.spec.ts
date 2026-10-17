import { TestBed } from '@angular/core/testing';
import { AppSkeletonComponent } from './skeleton.component';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AppSkeletonComponent);
  Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('div') as HTMLElement;
}

describe('AppSkeletonComponent', () => {
  it('por defecto: 100 % de ancho, 1rem de alto, rectángulo', () => {
    const el = render();

    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('1rem');
    expect(el.className).toContain('rounded-md');
  });

  it.each([
    ['sm', '0.75rem'],
    ['md', '1rem'],
    ['lg', '1.5rem'],
    ['xl', '2.5rem'],
  ])('tamaño %s → %s', (size, height) => {
    expect(render({ size }).style.height).toBe(height);
  });

  it('una altura explícita manda sobre el tamaño', () => {
    expect(render({ height: '3rem', size: 'sm' }).style.height).toBe('3rem');
  });

  it('variante círculo', () => {
    expect(render({ variant: 'circle', width: '40px' }).className).toContain('rounded-full');
  });
});
