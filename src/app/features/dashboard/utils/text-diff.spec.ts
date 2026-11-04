import { MAX_DIFF_LINES, changeCount, diffLines } from './text-diff';

const kinds = (before: string, after: string) => diffLines(before, after).map((l) => `${l.kind}:${l.text}`);

describe('diffLines', () => {
  it('textos iguales no tienen cambios', () => {
    expect(kinds('a\nb', 'a\nb')).toEqual(['same:a', 'same:b']);
    expect(changeCount(diffLines('a\nb', 'a\nb'))).toBe(0);
  });

  it('marca las líneas agregadas y las borradas', () => {
    expect(kinds('a\nb\nc', 'a\nx\nc')).toEqual(['same:a', 'del:b', 'add:x', 'same:c']);
  });

  it('una línea agregada al final y una borrada al inicio', () => {
    expect(kinds('a\nb', 'b\nc')).toEqual(['del:a', 'same:b', 'add:c']);
  });

  it('desde vacío todo es agregado y hacia vacío todo es borrado', () => {
    expect(kinds('', 'a\nb')).toEqual(['add:a', 'add:b']);
    expect(kinds('a\nb', '')).toEqual(['del:a', 'del:b']);
    expect(kinds('', '')).toEqual([]);
  });

  it('cuenta las líneas que cambiaron', () => {
    expect(changeCount(diffLines('a\nb\nc', 'a\nx\ny\nc'))).toBe(3);
  });

  it('con textos enormes no calcula la diferencia fina', () => {
    const big = Array.from({ length: MAX_DIFF_LINES + 1 }, (_, i) => `l${i}`).join('\n');

    const lines = diffLines(big, 'otro');

    expect(lines.filter((l) => l.kind === 'del')).toHaveLength(MAX_DIFF_LINES + 1);
    expect(lines.filter((l) => l.kind === 'add')).toHaveLength(1);
    expect(diffLines('uno', big).filter((l) => l.kind === 'add')).toHaveLength(MAX_DIFF_LINES + 1);
  });
});
