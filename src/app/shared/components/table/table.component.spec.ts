import { TestBed } from '@angular/core/testing';
import { AppTableComponent } from './table.component';
import { PaginationState, TableColumn } from '../../../core/models';

type Row = Record<string, unknown>;

const columns: TableColumn[] = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'company.name', label: 'Empresa' },
];
const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ name: `user-${String(i + 1).padStart(2, '0')}`, company: { name: `c${i}` } }));

function render(data: Row[], extra: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AppTableComponent<Row>);
  fixture.componentRef.setInput('columns', columns);
  fixture.componentRef.setInput('data', data);
  Object.entries(extra).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    names: () => Array.from(el.querySelectorAll('tbody tr td:first-child')).map((td) => td.textContent!.trim()),
    headers: () => Array.from(el.querySelectorAll('th')) as HTMLElement[],
    pageButtons: () => Array.from(el.querySelectorAll('button')) as HTMLButtonElement[],
  };
}

describe('AppTableComponent', () => {
  it('pinta cabeceras y filas, incluidos valores anidados', () => {
    const t = render(rows(2));

    expect(t.headers().map((h) => h.textContent!.trim())).toEqual(['Nombre', 'Empresa']);
    expect(t.names()).toEqual(['user-01', 'user-02']);
    expect(t.el.textContent).toContain('c0');
  });

  it('sin datos muestra el estado vacío y no pagina', () => {
    const t = render([]);

    expect(t.el.textContent).toContain('No hay datos disponibles');
    expect(t.pageButtons()).toHaveLength(0);
  });

  it('getNestedValue devuelve cadena vacía para rutas inexistentes o nulas', () => {
    const { fixture } = render([]);
    const c = fixture.componentInstance;

    expect(c.getNestedValue({ a: { b: 1 } }, 'a.b')).toBe('1');
    expect(c.getNestedValue({ a: 1 }, 'x.y')).toBe('');
    expect(c.getNestedValue({ a: null }, 'a')).toBe('');
  });

  describe('orden', () => {
    it('una columna no ordenable no reacciona al clic', () => {
      const t = render(rows(3).reverse());

      t.headers()[1].click();
      t.fixture.detectChanges();

      expect(t.fixture.componentInstance.sortKey()).toBe('');
    });

    it('ordena ascendente, luego descendente y cambia de columna', () => {
      const t = render([{ name: 'b', company: { name: 'z' } }, { name: 'a', company: { name: 'y' } }, { name: 'c', company: { name: 'x' } }]);

      t.headers()[0].click();
      t.fixture.detectChanges();
      expect(t.names()).toEqual(['a', 'b', 'c']);

      t.headers()[0].click();
      t.fixture.detectChanges();
      expect(t.names()).toEqual(['c', 'b', 'a']);
      expect(t.fixture.componentInstance.sortDirection()).toBe('desc');
    });

    it('empata sin reordenar', () => {
      const t = render([{ name: 'a', company: { name: '1' } }, { name: 'a', company: { name: '2' } }]);

      t.headers()[0].click();
      t.fixture.detectChanges();

      expect(t.el.textContent).toContain('1');
    });
  });

  describe('paginación', () => {
    it('con una sola página no muestra controles', () => {
      expect(render(rows(5), { pageSize: 10 }).pageButtons()).toHaveLength(0);
    });

    it('muestra el rango y navega con Siguiente/Anterior y emite pageChange', () => {
      const t = render(rows(25), { pageSize: 10 });
      const events: PaginationState[] = [];
      t.fixture.componentInstance.pageChange.subscribe((e) => events.push(e));
      expect(t.names()).toHaveLength(10);
      expect(t.el.textContent).toContain('Mostrando 1–10 de 25');
      const prev = () => t.el.querySelector('[aria-label="Previous page"]') as HTMLButtonElement;
      const next = () => t.el.querySelector('[aria-label="Next page"]') as HTMLButtonElement;
      expect(prev().disabled).toBe(true);

      next().click();
      t.fixture.detectChanges();
      expect(t.names()[0]).toBe('user-11');
      expect(events.at(-1)).toEqual({ page: 2, pageSize: 10, total: 25 });

      next().click();
      t.fixture.detectChanges();
      expect(t.names()).toHaveLength(5);
      expect(t.el.textContent).toContain('Mostrando 21–25 de 25');
      expect(next().disabled).toBe(true);

      prev().click();
      t.fixture.detectChanges();
      expect(t.fixture.componentInstance.currentPage()).toBe(2);
    });

    it('un número de página lleva a esa página; fuera de rango se ignora', () => {
      const t = render(rows(25), { pageSize: 10 });
      const c = t.fixture.componentInstance;

      t.pageButtons().find((b) => b.textContent!.trim() === '3')!.click();
      t.fixture.detectChanges();
      expect(c.currentPage()).toBe(3);

      c.goToPage(0);
      c.goToPage(99);
      expect(c.currentPage()).toBe(3);
    });

    it('la ventana de páginas visibles es de ±2 alrededor de la actual', () => {
      const t = render(rows(100), { pageSize: 10 });
      const c = t.fixture.componentInstance;

      expect(c.visiblePages()).toEqual([1, 2, 3]);
      c.goToPage(6);
      expect(c.visiblePages()).toEqual([4, 5, 6, 7, 8]);
      c.goToPage(10);
      expect(c.visiblePages()).toEqual([8, 9, 10]);
    });
  });
});
