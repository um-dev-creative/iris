import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { DataViewPageComponent } from './data-view-page.component';
import { MonitoringDataService } from '../../services/monitoring-data.service';
import { monitoringProviders, overviewFixture } from '../../services/monitoring.testing';

async function render(overview = overviewFixture()) {
  TestBed.configureTestingModule({ providers: monitoringProviders });
  const fixture = TestBed.createComponent(DataViewPageComponent);
  // la página pide los datos al crearse; la espera de abajo terminaría solo cuando esa petición responde
  TestBed.inject(HttpTestingController).match(() => true).forEach((request) => request.flush(overview));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
  return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, data: TestBed.inject(MonitoringDataService), settle };
}

describe('DataViewPageComponent', () => {
  it('muestra la primera página con las campañas más recientes', async () => {
    const { c, el } = await render();

    expect(c.paginatedLogs()).toHaveLength(10);
    expect(c.paginatedLogs()[0].id).toBe('id-30');
    expect(c.totalPages()).toBe(3);
    expect(el.textContent).toContain('Campaña 30');
  });

  it('cuenta entregados, fallidos y pendientes', async () => {
    const { c, data } = await render();
    const total = data.allLogs().length;

    expect(c.deliveredCount() + c.failedCount() + c.pendingCount()).toBe(total);
  });

  it('busca por nombre, ignorando mayúsculas', async () => {
    const { c, settle } = await render();

    c.searchTerm.set('CAMPAÑA 05');
    await settle();

    expect(c.filteredLogs().map((l) => l.id)).toEqual(['id-05']);
    expect(c.hasActiveFilters()).toBe(true);
  });

  it('filtra por proveedor y estado y combina filtros', async () => {
    const { c, settle } = await render();

    c.selectedProvider.set('sms');
    await settle();
    expect(c.filteredLogs().every((l) => l.provider === 'sms')).toBe(true);

    c.selectedStatus.set('failed');
    await settle();
    expect(c.filteredLogs().every((l) => l.provider === 'sms' && l.status === 'failed')).toBe(true);
  });

  it('un filtro sin resultados muestra el estado vacío y "Limpiar" lo resuelve', async () => {
    const { c, el, settle } = await render();

    c.searchTerm.set('no-existe');
    await settle();
    expect(c.paginatedLogs()).toHaveLength(0);
    expect(c.totalPages()).toBe(1);

    c.clearFilters();
    await settle();
    expect(c.hasActiveFilters()).toBe(false);
    expect(c.filteredLogs().length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Campaña');
  });

  it('ordena: misma columna alterna dirección, otra columna empieza ascendente', async () => {
    const { c, settle } = await render();

    c.toggleSort('id');
    await settle();
    expect(c.sortDir()).toBe('asc');
    expect(c.paginatedLogs()[0].id).toBe('id-01');

    c.toggleSort('status');
    await settle();
    expect(c.sortKey()).toBe('status');
    expect(c.sortDir()).toBe('asc');
  });

  it('pagina y vuelve a la página 1 al cambiar un filtro', async () => {
    const { c, settle } = await render();

    c.currentPage.set(3);
    await settle();
    expect(c.paginatedLogs()).toHaveLength(10);
    expect(c.pageStart()).toBe(20);

    c.currentPage.set(2);
    c.selectedStatus.set('delivered');
    await settle();
    expect(c.currentPage()).toBe(1);
    expect(c.pageNumbers().length).toBe(c.totalPages());
  });

  it('los chips de filtros activos quitan cada filtro al pulsarlos', async () => {
    const { c, el, settle } = await render();
    c.searchTerm.set('Campaña');
    c.selectedProvider.set('email');
    c.selectedStatus.set('delivered');
    await settle();

    const chips = () => Array.from(el.querySelectorAll('button')).filter((b) => /Búsqueda|Email|Entregada/.test(b.textContent!));
    expect(chips()).toHaveLength(3);

    chips().find((b) => b.textContent!.includes('Búsqueda'))!.click();
    await settle();
    expect(c.searchTerm()).toBe('');

    chips().find((b) => b.textContent!.includes('Email'))!.click();
    await settle();
    expect(c.selectedProvider()).toBe('all');

    chips().find((b) => b.textContent!.includes('Entregada'))!.click();
    await settle();
    expect(c.hasActiveFilters()).toBe(false);
  });

  it('los auxiliares de proveedor y estado tienen valor por defecto para desconocidos', async () => {
    const { c } = await render();

    expect(c.providerLabel('sms')).toBe('SMS');
    expect(c.providerLabel('fax')).toBe('fax');
    expect(c.providerClasses('whatsapp')).toContain('chart-2');
    expect(c.providerClasses('fax')).toBe('');
    expect(c.providerIcon('fax')).toBe(c.providerIcon('email'));
    expect(c.statusLabel('pending')).toBe('En curso');
    expect(c.statusLabel('otro')).toBe('otro');
    expect(c.statusClasses('failed')).toContain('bg-destructive');
    expect(c.statusClasses('otro')).toBe('');
    expect(c.statusDotClass('delivered')).toBe('bg-success');
    expect(c.statusDotClass('otro')).toBe('');
  });
});
