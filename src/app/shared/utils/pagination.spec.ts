import { clampPage, pageCount, paginate } from './pagination';

const ITEMS = [1, 2, 3, 4, 5, 6, 7];

describe('pageCount', () => {
  it.each([
    [25, 10, 3],
    [20, 10, 2],
    [1, 10, 1],
    [0, 10, 1],
    [-5, 10, 1],
    [10, 0, 1],
    [10, -3, 1],
    [10, NaN, 1],
    [10, 0.5, 1],
    [10, 2.9, 5],
    [NaN, 10, 1],
  ])('total %s, tamaño %s → %s páginas', (total, size, expected) => {
    expect(pageCount(total, size)).toBe(expected);
  });
});

describe('clampPage', () => {
  it.each([
    [0, 3, 1],
    [-4, 3, 1],
    [1, 3, 1],
    [2, 3, 2],
    [9, 3, 3],
    [2.9, 3, 2],
    [NaN, 3, 1],
    [Infinity, 3, 3],
    [5, 0, 1],
    [5, NaN, 1],
  ])('página %s de %s → %s', (page, pages, expected) => {
    expect(clampPage(page, pages)).toBe(expected);
  });
});

describe('paginate', () => {
  it('devuelve la página pedida con sus índices', () => {
    expect(paginate(ITEMS, 2, 3)).toEqual({ items: [4, 5, 6], page: 2, pageSize: 3, total: 7, pageCount: 3, start: 3, end: 6 });
  });

  it('la última página puede quedar incompleta', () => {
    const page = paginate(ITEMS, 3, 3);

    expect(page.items).toEqual([7]);
    expect([page.start, page.end]).toEqual([6, 7]);
  });

  it('una página fuera de rango se ajusta (0 → primera, 99 → última)', () => {
    expect(paginate(ITEMS, 0, 3).page).toBe(1);
    expect(paginate(ITEMS, 99, 3)).toMatchObject({ page: 3, items: [7] });
  });

  it('total 0: una página vacía', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageSize: 10, total: 0, pageCount: 1, start: 0, end: 0 });
  });

  it('un tamaño no válido devuelve todos los elementos en una página', () => {
    expect(paginate(ITEMS, 1, 0)).toMatchObject({ items: ITEMS, pageCount: 1, start: 0, end: 7 });
    expect(paginate(ITEMS, 1, NaN).items).toEqual(ITEMS);
    expect(paginate(ITEMS, 1, 0.5).items).toEqual(ITEMS);
  });

  it('no modifica el arreglo original', () => {
    const copy = [...ITEMS];

    paginate(ITEMS, 2, 3);

    expect(ITEMS).toEqual(copy);
  });
});
