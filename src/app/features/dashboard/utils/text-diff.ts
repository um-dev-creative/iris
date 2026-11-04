export type DiffKind = 'same' | 'add' | 'del';

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/** Textos más largos que esto (en líneas por lado) se comparan sin calcular la diferencia fina. */
export const MAX_DIFF_LINES = 2000;

/**
 * Diferencia por líneas entre `before` y `after` (subsecuencia común más larga). `del` son líneas que estaban y ya no,
 * `add` las que se agregaron. Si algún lado supera {@link MAX_DIFF_LINES} líneas devuelve todo lo anterior como borrado y todo
 * lo nuevo como agregado, para no bloquear el navegador.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    return [...a.map((text) => ({ kind: 'del' as const, text })), ...b.map((text) => ({ kind: 'add' as const, text }))];
  }
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: 'del', text: a[i++] });
    } else {
      out.push({ kind: 'add', text: b[j++] });
    }
  }
  while (i < a.length) out.push({ kind: 'del', text: a[i++] });
  while (j < b.length) out.push({ kind: 'add', text: b[j++] });
  return out;
}

/** Cuántas líneas cambiaron. */
export const changeCount = (lines: readonly DiffLine[]): number => lines.filter((line) => line.kind !== 'same').length;
