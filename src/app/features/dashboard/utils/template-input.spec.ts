import { describeProblem, fileNameFor, formatOfFile, lineRange, previewDocument, TEMPLATE_FILE_NAME, withDetectedParams, withFormat } from './template-input';

describe('fileNameFor', () => {
  it.each([
    ['Bienvenida: ¡Hola!', 'MD', 'bienvenida-hola.md'],
    ['  Código de verificación  ', 'HTML', 'codigo-de-verificacion.html'],
    ['ÁÉÍÓÚ ñandú', 'MD', 'aeiou-nandu.md'],
    ['---', 'MD', ''],
    ['', 'HTML', ''],
  ])('%j → %j', (description, format, expected) => {
    expect(fileNameFor(description, format as 'MD' | 'HTML')).toBe(expected);
  });

  it('corta nombres largos y siempre cumple las reglas de Mercury', () => {
    const name = fileNameFor('a '.repeat(200), 'MD');

    expect(name.length).toBeLessThanOrEqual(128);
    expect(TEMPLATE_FILE_NAME.test(name)).toBe(true);
  });
});

describe('TEMPLATE_FILE_NAME', () => {
  it.each(['a.ftl', 'zb_x_es.ftl', 'v1.2.html', 'a-b_c.md'])('acepta %s', (name) => expect(TEMPLATE_FILE_NAME.test(name)).toBe(true));
  it.each(['', '../a.ftl', 'a/b.ftl', '.a.ftl', 'a.exe', 'a b.md', 's3://x/a.html'])('rechaza %j', (name) => expect(TEMPLATE_FILE_NAME.test(name)).toBe(false));
});

describe('formato', () => {
  it('formatOfFile distingue Markdown del resto', () => {
    expect(formatOfFile('a.md')).toBe('MD');
    expect(formatOfFile('a.html')).toBe('HTML');
    expect(formatOfFile('a.ftl')).toBe('HTML');
  });

  it('withFormat cambia la extensión y conserva el nombre', () => {
    expect(withFormat('bienvenida.html', 'MD')).toBe('bienvenida.md');
    expect(withFormat('v1.2.md', 'HTML')).toBe('v1.2.html');
    expect(withFormat('', 'MD')).toBe('');
  });
});

describe('lineRange', () => {
  const text = 'uno\ndos\ntres';

  it('da el inicio y fin de una línea', () => {
    expect(lineRange(text, 1)).toEqual({ start: 0, end: 3 });
    expect(lineRange(text, 2)).toEqual({ start: 4, end: 7 });
    expect(lineRange(text, 3)).toEqual({ start: 8, end: 12 });
  });

  it('ajusta una línea fuera de rango', () => {
    expect(lineRange(text, 0)).toEqual({ start: 0, end: 3 });
    expect(lineRange(text, 99)).toEqual({ start: 8, end: 12 });
  });
});

describe('describeProblem', () => {
  it('incluye línea y columna cuando existen', () => {
    expect(describeProblem({ line: 3, column: 5, message: 'falta cerrar' })).toBe('Línea 3, columna 5: falta cerrar');
    expect(describeProblem({ line: 3, column: 0, message: 'falta cerrar' })).toBe('Línea 3: falta cerrar');
    expect(describeProblem({ line: 0, column: 0, message: 'general' })).toBe('general');
  });
});

describe('withDetectedParams', () => {
  it('agrega solo los parámetros que faltan', () => {
    expect(withDetectedParams('name=Ana', ['name', 'code'])).toBe('name=Ana\ncode=');
  });

  it('parte de vacío', () => {
    expect(withDetectedParams('', ['a', 'b'])).toBe('a=\nb=');
  });

  it('no cambia nada si ya están todos', () => {
    expect(withDetectedParams('a=1\nb=2', ['a', 'b'])).toBe('a=1\nb=2');
  });
});

describe('previewDocument', () => {
  it('envuelve el HTML con una política que bloquea scripts', () => {
    const doc = previewDocument('<p>Hola</p>');

    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain('<p>Hola</p>');
    expect(doc).not.toContain('script-src');
  });
});
