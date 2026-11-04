import {
  fromInputDateTime, isEnabled, paramsToText, parseParams, parseRecipients, percent, recipientsToText, statusTone, toDate, toInputDateTime,
} from './campaign-input';

describe('parseRecipients', () => {
  it('lee identificador y nombre separados por coma, punto y coma o tabulador', () => {
    const { recipients } = parseRecipients('a@x.co,Ana\nb@x.co;Beto\nc@x.co\tCarla\nd@x.co');

    expect(recipients).toEqual([
      { identifier: 'a@x.co', name: 'Ana' },
      { identifier: 'b@x.co', name: 'Beto' },
      { identifier: 'c@x.co', name: 'Carla' },
      { identifier: 'd@x.co' },
    ]);
  });

  it('ignora vacías y una cabecera, y quita comillas', () => {
    const { recipients, invalidLines } = parseRecipients('Email,Nombre\n\n"a@x.co","Ana"\r\n');

    expect(recipients).toEqual([{ identifier: 'a@x.co', name: 'Ana' }]);
    expect(invalidLines).toEqual([]);
  });

  it('descarta repetidos sin distinguir mayúsculas y los cuenta', () => {
    const result = parseRecipients('a@x.co\nA@X.CO,Otra\nb@x.co');

    expect(result.recipients.map((r) => r.identifier)).toEqual(['a@x.co', 'b@x.co']);
    expect(result.duplicates).toBe(1);
  });

  it('señala las líneas sin identificador', () => {
    expect(parseRecipients('a@x.co\n,sin id\nb@x.co').invalidLines).toEqual([2]);
  });

  it('un texto vacío no da destinatarios', () => {
    expect(parseRecipients('  \n ').recipients).toEqual([]);
  });

  it('recipientsToText vuelve a escribir lo que se leyó', () => {
    const text = 'a@x.co,Ana\nb@x.co';

    expect(recipientsToText(parseRecipients(text).recipients)).toBe(text);
  });
});

describe('parseParams', () => {
  it('lee clave=valor y conserva "=" dentro del valor', () => {
    expect(parseParams('firstName=Ana\nurl = https://x.co/?a=1\n').params).toEqual({ firstName: 'Ana', url: 'https://x.co/?a=1' });
  });

  it('señala claves inválidas o líneas sin "="', () => {
    expect(parseParams('ok=1\n1mal=2\nsolo texto\n=vacío').invalidLines).toEqual([2, 3, 4]);
  });

  it('paramsToText los escribe de nuevo, y tolera nulos', () => {
    expect(paramsToText({ a: 1, b: null })).toBe('a=1\nb=');
    expect(paramsToText(null)).toBe('');
  });
});

describe('fechas', () => {
  it('toInputDateTime acepta el formato de Mercury y el ISO', () => {
    expect(toInputDateTime('2026-03-20 10:30:15')).toBe('2026-03-20T10:30');
    expect(toInputDateTime('2026-03-20T10:30:00')).toBe('2026-03-20T10:30');
    expect(toInputDateTime('basura')).toBe('');
    expect(toInputDateTime(null)).toBe('');
  });

  it('fromInputDateTime agrega segundos o devuelve undefined', () => {
    expect(fromInputDateTime('2026-03-20T10:30')).toBe('2026-03-20T10:30:00');
    expect(fromInputDateTime('')).toBeUndefined();
  });

  it('toDate devuelve una fecha o null', () => {
    expect(toDate('2026-03-20 10:30:00')?.getFullYear()).toBe(2026);
    expect(toDate('x')).toBeNull();
  });
});

describe('estado', () => {
  it('isEnabled solo es falso si Mercury lo dice', () => {
    expect(isEnabled({ enabled: false })).toBe(false);
    expect(isEnabled({ enabled: true })).toBe(true);
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ enabled: null })).toBe(true);
  });

  it('percent acota y no divide por cero', () => {
    expect(percent(1, 4)).toBe(25);
    expect(percent(9, 4)).toBe(100);
    expect(percent(1, 0)).toBe(0);
  });

  it.each([
    ['COMPLETED', 'success'], ['scheduled', 'primary'], ['FAILED', 'danger'], ['DRAFT', 'warning'], ['otro', 'neutral'],
  ])('statusTone(%s) = %s', (status, tone) => {
    expect(statusTone(status)).toBe(tone);
  });
});
