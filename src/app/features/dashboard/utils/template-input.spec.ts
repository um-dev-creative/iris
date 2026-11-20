import { describeProblem, emptySamples, fileNameFor, formatOfFile, lineRange, previewDocument, renderSubject, TEMPLATE_FILE_NAME, withDetectedParams, withFormat } from './template-input';

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

describe('renderSubject', () => {
  it('pone los datos de ejemplo y deja una sola línea', () => {
    expect(renderSubject('  Hola ${name},\n tu código   es ${ code } ', { name: 'Ana', code: '123' })).toEqual({ text: 'Hola Ana, tu código es 123', missing: [], approximate: false });
  });

  it('usa el respaldo de ${dato!"…"} y ${dato!} cuando el dato no viene', () => {
    expect(renderSubject('A ${x!"uno"} ${y!\'dos\'} ${z!}.', {}).text).toBe('A uno dos .');
    expect(renderSubject('${x!"uno"}', { x: 'real' }).text).toBe('real');
  });

  it('dice qué datos faltan y los deja tal cual', () => {
    expect(renderSubject('Hola ${name}', {})).toEqual({ text: 'Hola ${name}', missing: ['name'], approximate: false });
  });

  it('marca como aproximado lo que no es un dato simple', () => {
    expect(renderSubject('${name?upper_case} <#if x>y</#if>', { name: 'a' }).approximate).toBe(true);
  });
});

describe('emptySamples', () => {
  it('lista los datos usados sin valor de ejemplo', () => {
    expect(emptySamples(['a', 'b', 'c'], { a: 'x', b: '  ' })).toEqual(['b', 'c']);
  });
});

describe('previewDocument (móvil)', () => {
  it('lleva viewport para verse como en un teléfono', () => {
    expect(previewDocument('<p>x</p>')).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });
});
