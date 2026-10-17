import { TestBed } from '@angular/core/testing';
import { AppNotificationComponent } from './notification.component';
import { NotificationService, ToastMessage } from '../../../core/services/notification.service';

describe('AppNotificationComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function render() {
    const fixture = TestBed.createComponent(AppNotificationComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, service: TestBed.inject(NotificationService) };
  }

  it('no pinta toasts cuando no hay avisos', () => {
    expect(render().el.querySelectorAll('button')).toHaveLength(0);
  });

  it.each(['success', 'error', 'warning', 'info'] as const)('pinta un toast de tipo %s con título y mensaje', (type) => {
    const { fixture, el, service } = render();

    service[type]('Título', 'Mensaje');
    fixture.detectChanges();

    expect(el.textContent).toContain('Título');
    expect(el.textContent).toContain('Mensaje');
    expect(el.querySelectorAll('button')).toHaveLength(1);
  });

  it('el botón de cierre descarta el toast', () => {
    const { fixture, el, service } = render();
    service.info('a', 'b', 0);
    fixture.detectChanges();

    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.toasts()).toHaveLength(0);
    expect(el.querySelectorAll('button')).toHaveLength(0);
  });

  it('toastClasses cae en info para tipos desconocidos', () => {
    const { fixture } = render();

    const classes = fixture.componentInstance.toastClasses({ type: 'raro' } as unknown as ToastMessage);

    expect(classes).toContain('border-primary');
  });
});
