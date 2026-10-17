import { ROUTE_PATHS, routeUrl } from './route-paths';

describe('ROUTE_PATHS', () => {
  it('no repite ningún segmento (salvo la raíz vacía, única)', () => {
    const values = Object.values(ROUTE_PATHS);

    expect(new Set(values).size).toBe(values.length);
  });

  it('solo los segmentos propios de la app llevan texto; ningún segmento lleva barras', () => {
    Object.values(ROUTE_PATHS).forEach((segment) => expect(segment).not.toContain('/'));
  });

  it('reserva LOGIN para la fase de autenticación', () => {
    expect(ROUTE_PATHS.LOGIN).toBe('login');
  });
});

describe('routeUrl', () => {
  it('une los segmentos en una URL absoluta', () => {
    expect(routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.DATA)).toBe('/dashboard/data');
  });

  it('con un solo segmento devuelve su ruta absoluta', () => {
    expect(routeUrl(ROUTE_PATHS.DASHBOARD)).toBe('/dashboard');
  });

  it('ignora los segmentos vacíos', () => {
    expect(routeUrl(ROUTE_PATHS.ROOT, ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.ROOT)).toBe('/dashboard');
  });

  it('sin segmentos devuelve la raíz', () => {
    expect(routeUrl()).toBe('/');
  });
});
