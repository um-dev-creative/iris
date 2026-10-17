import { TestBed } from '@angular/core/testing';
import { AppBadgeComponent } from './badge.component';

const classesFor = (color?: string) => {
  const fixture = TestBed.createComponent(AppBadgeComponent);
  if (color !== undefined) fixture.componentRef.setInput('color', color);
  fixture.detectChanges();
  return (fixture.nativeElement.querySelector('span') as HTMLElement).className;
};

describe('AppBadgeComponent', () => {
  it('usa el color por defecto', () => {
    expect(classesFor()).toContain('bg-primary');
  });

  it.each([
    ['primary', 'bg-primary'],
    ['secondary', 'bg-secondary'],
    ['destructive', 'bg-destructive'],
    ['danger', 'bg-destructive'],
    ['outline', 'border-border'],
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['neutral', 'bg-muted'],
  ])('color %s', (color, cls) => {
    expect(classesFor(color)).toContain(cls);
  });

  it('un color desconocido cae en el por defecto', () => {
    expect(classesFor('inventado')).toContain('bg-primary');
  });
});
