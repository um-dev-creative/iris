// Proxy de `ng serve` (:4200) hacia el BFF local, para que el navegador use URLs relativas sin CORS.
// El destino sale de IRIS_BFF_URL (http o https); por defecto el BFF de `pnpm server` en :4000.
const target = process.env.IRIS_BFF_URL || 'http://localhost:4000';

// Solo desarrollo: el BFF puede servirse con un certificado autofirmado (SSL_CERT_PATH/SSL_KEY_PATH).
const secure = false;

const route = { target, secure, changeOrigin: false, logLevel: 'warn' };

export default {
  '/mrc': route,
  '/bkd': route,
  '/health': route,
};
