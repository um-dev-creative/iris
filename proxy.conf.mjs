// Proxy de `ng serve` (:4200) hacia el BFF local, para que el navegador use URLs relativas sin CORS.
// El destino sale de IRIS_BFF_URL ; por defecto el BFF de `pnpm start:bff`, en https://localhost:4000.
const target = process.env.IRIS_BFF_URL || 'https://localhost:4000';

// Solo desarrollo: el BFF usa el certificado autofirmado de scripts/dev-cert.mjs.
const secure = false;

const route = { target, secure, changeOrigin: false, logLevel: 'warn' };

export default {
  '/mrc': route,
  '/bkd': route,
  '/health': route,
};
