import { TestBed } from '@angular/core/testing';
import { Server } from 'lucide-angular';
import { ServiceStatusCardComponent } from './service-status-card.component';
import { ServiceStatus } from '../../models/monitoring.model';

const service = (status: ServiceStatus['status']): ServiceStatus => ({ name: 'API Gateway', status, latency: 45, icon: Server });

function render(s: ServiceStatus) {
  const fixture = TestBed.createComponent(ServiceStatusCardComponent);
  fixture.componentRef.setInput('service', s);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ServiceStatusCardComponent', () => {
  it('muestra nombre y latencia', () => {
    const el = render(service('operational'));

    expect(el.textContent).toContain('API Gateway');
    expect(el.textContent).toContain('45 ms');
  });

  it.each([
    ['operational', 'Operational', 'bg-success'],
    ['degraded', 'Degraded', 'bg-warning'],
    ['down', 'Down', 'bg-destructive'],
  ] as const)('estado %s → etiqueta y color', (status, label, dot) => {
    const el = render(service(status));

    expect(el.textContent).toContain(label);
    expect(el.querySelector(`span.${dot}`)).not.toBeNull();
  });
});
