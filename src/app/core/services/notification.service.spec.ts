import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(NotificationService);
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    ['success', 4000],
    ['error', 6000],
    ['warning', 5000],
    ['info', 4000],
  ] as const)('%s agrega un toast que se descarta tras %i ms', (type, duration) => {
    service[type]('Título', 'Mensaje');

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]).toMatchObject({ type, title: 'Título', message: 'Mensaje', duration });

    vi.advanceTimersByTime(duration - 1);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('dismiss quita solo el toast indicado', () => {
    service.info('a', 'a');
    service.info('b', 'b');
    const [first] = service.toasts();

    service.dismiss(first.id);

    expect(service.toasts().map((t) => t.title)).toEqual(['b']);
  });

  it('una duración 0 deja el toast hasta que se descarte a mano', () => {
    service.success('fijo', 'x', 0);

    vi.advanceTimersByTime(60_000);

    expect(service.toasts()).toHaveLength(1);
  });

  it('cada toast tiene un id distinto', () => {
    service.info('a', 'a');
    service.info('b', 'b');

    const ids = service.toasts().map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
