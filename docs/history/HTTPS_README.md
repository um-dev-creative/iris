# HTTPS Implementation Test

## SSL/HTTPS Configuration

The Angular SSR server has been successfully configured with HTTPS support using the existing SSL certificates in the `/ssl` directory.

### Key Features Implemented:

1. **Automatic SSL Certificate Detection**: The server automatically detects and loads SSL certificates from:
   - `ssl/backbone.key` (private key)  
   - `ssl/backbone.crt` (certificate)

2. **Graceful HTTP Fallback**: If SSL certificates are not available, the server falls back to HTTP mode with appropriate warnings.

3. **Security Headers**: When running in HTTPS mode, the server automatically adds security headers:
   - `Strict-Transport-Security` (HSTS)
   - `Content-Security-Policy`
   - `X-Content-Type-Options`
   - `X-Frame-Options`
   - `X-XSS-Protection`
   - `Referrer-Policy`

4. **Rate Limiting**: Enhanced security with API rate limiting (100 requests per 15 minutes).

5. **Development Environment Support**: Disabled TLS certificate validation for development environments.

### Usage:

#### Build and Run HTTPS Server:
```bash
npm run build:ssr
npm run server:ssr:https
```

#### Development with HTTPS:
```bash
npm run dev:https
```

#### Testing HTTPS Connection:
```bash
curl -k https://localhost:4000/dashboard
```

### Configuration:

The HTTPS server runs on the same port as configured by the `PORT` environment variable (default: 4000).

**HTTPS URL**: `https://localhost:4000/dashboard`
**HTTP Fallback**: `http://localhost:4000/dashboard` (when SSL certificates are unavailable)
