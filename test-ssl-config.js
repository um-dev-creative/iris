const { resolve, join } = require('path');
const { readFileSync } = require('fs');

// Set up environment
process.env['NODE_CONFIG_DIR'] = './server/config';
process.env['NODE_ENV'] = 'development';

const projectRoot = resolve(process.cwd());

// SSL Configuration - Environment Configurable
function getSSLConfiguration() {
  let config;
  try {
    config = require('config');
  } catch (error) {
    console.warn('⚠ Configuration not available, SSL disabled');
    return null;
  }

  const sslConfig = config.ssl;

  // Check if SSL is enabled in configuration
  if (!sslConfig?.enabled) {
    console.log('✓ SSL disabled by configuration');
    return null;
  }

  const certificateType = sslConfig.certificateType || 'backbone';
  const certificateConfig = sslConfig.certificates?.[certificateType];

  if (!certificateConfig) {
    console.warn(`⚠ Certificate configuration not found for type: ${certificateType}`);
    return null;
  }

  const keyPath = resolve(projectRoot, certificateConfig.keyPath);
  const certPath = resolve(projectRoot, certificateConfig.certPath);

  console.log(`✓ Loading SSL certificates for type: ${certificateType}`);
  console.log(`  - Key Path: ${keyPath}`);
  console.log(`  - Cert Path: ${certPath}`);

  try {
    const sslOptions = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath)
    };
    console.log(`✓ SSL certificates loaded successfully for ${certificateType}`);
    return sslOptions;
  } catch (error) {
    console.warn(`⚠ SSL certificates not found or not readable for ${certificateType}:`, error.message);
    console.warn('  Server will start in HTTP mode.');
    return null;
  }
}

// Test SSL configuration
console.log('=== Testing SSL Configuration ===');
const sslOptions = getSSLConfiguration();
console.log('SSL Options available:', !!sslOptions);

if (sslOptions) {
  console.log('✓ SSL certificates ready for HTTPS mode');
} else {
  console.log('! No SSL certificates available, will run in HTTP mode');
}
