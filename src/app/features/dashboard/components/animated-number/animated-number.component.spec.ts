import { TestBed } from '@angular/core/testing';
import { AnimatedNumberComponent } from './animated-number.component';

function render(value: number, tone: 'normal' | 'inverse' = 'normal') {
  const fixture = TestBed.createComponent(AnimatedNumberComponent);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('tone', tone);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, component: fixture.componentInstance };
}

describe('AnimatedNumberComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sin animación muestra el valor exacto al instante', () => {
    const { fixture, el } = render(1500);
    expect(el.textContent).toContain('1,500');

    fixture.componentRef.setInput('value', 20);
    fixture.detectChanges();
    expect(el.querySelector('[aria-hidden="true"]')?.textContent).toBe('20');
    expect(el.querySelector('.sr-only')?.textContent).toBe('20');
  });

  describe('con animación', () => {
    let frames: FrameRequestCallback[];
    const runFrames = (now: number) => {
      const pending = frames;
      frames = [];
      pending.forEach((cb) => cb(now));
    };

    beforeEach(() => {
      frames = [];
      vi.useFakeTimers();
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
      vi.stubGlobal('cancelAnimationFrame', () => (frames = []));
      vi.spyOn(performance, 'now').mockReturnValue(0);
    });

    it('cuenta hasta el valor nuevo y destella en verde si sube', () => {
      const { fixture, el, component } = render(0);
      fixture.componentRef.setInput('value', 100);
      fixture.detectChanges();

      expect(component.label()).toBe('100');
      expect(el.classList.contains('iris-flash-good')).toBe(true);
      runFrames(325);
      const middle = Number(component.text());
      expect(middle).toBeGreaterThan(0);
      expect(middle).toBeLessThan(100);
      runFrames(1000);
      expect(component.text()).toBe('100');
      expect(frames).toHaveLength(0);

      vi.advanceTimersByTime(1300);
      fixture.detectChanges();
      expect(el.classList.contains('iris-flash-good')).toBe(false);
    });

    it('con tono inverso, subir es malo', () => {
      const { fixture, el } = render(1, 'inverse');
      fixture.componentRef.setInput('value', 5);
      fixture.detectChanges();

      expect(el.classList.contains('iris-flash-bad')).toBe(true);
    });

    it('un valor nuevo a mitad de camino reinicia desde donde iba', () => {
      const { fixture, component } = render(0);
      fixture.componentRef.setInput('value', 100);
      fixture.detectChanges();
      runFrames(300);
      fixture.componentRef.setInput('value', 10);
      fixture.detectChanges();
      runFrames(2000);

      expect(component.text()).toBe('10');
    });

    it('al destruirse cancela lo pendiente', () => {
      const { fixture } = render(0);
      fixture.componentRef.setInput('value', 50);
      fixture.detectChanges();
      fixture.destroy();

      expect(frames).toHaveLength(0);
    });
  });
});
