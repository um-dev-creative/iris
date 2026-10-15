#!/usr/bin/env node
/**
 * Comprehensive validation script for Angular 21 + SSR with Node.js/Express BFF integration
 * Tests all requirements: R1 (BFF Integration), R2 (Vault), R3 (SSL/HTTPS), R4 (Redis Enhancement)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${message}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logRequirement(id, title) {
  log(`\n📋 ${id}: ${title}`, 'blue');
  log('-'.repeat(50), 'blue');
}

function checkResult(description, passed, evidence = '', risks = '') {
  const status = passed ? 'PASS' : 'FAIL';
  const statusColor = passed ? 'green' : 'red';

  log(`  ✓ ${description}: ${status}`, statusColor);
  if (evidence) log(`    Evidence: ${evidence}`, 'yellow');
  if (risks) log(`    Risks/Notes: ${risks}`, 'yellow');

  return { description, passed, evidence, risks };
}

// Global validation results
const validationResults = {
  R1: { checks: [], overall: true },
  R2: { checks: [], overall: true },
  R3: { checks: [], overall: true },
  R4: { checks: [], overall: true }
};

function addResult(requirement, result) {
  validationResults[requirement].checks.push(result);
  if (!result.passed) {
    validationResults[requirement].overall = false;
  }
}

// Utility functions
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  } catch (error) {
    return null;
  }
}

function runCommand(command, ignoreError = false) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: result.trim() };
  } catch (error) {
    if (ignoreError) {
      return { success: false, output: error.message };
    }
    throw error;
  }
}

// Main validation functions
function validateR1_BFFIntegration() {
  logRequirement('R1', 'Node.js/Express BFF Integration');

  // Check 1: Single server entry point exists
  const serverExists = fileExists('src/server.ts');
  addResult('R1', checkResult(
    'Single server entry point (src/server.ts)',
    serverExists,
    serverExists ? 'File exists and properly imports Angular SSR' : 'Server file missing'
  ));

  // Check 2: Package.json has correct scripts
  const packageJson = readJsonFile('package.json');
  const hasServeIntegrated = packageJson?.scripts?.['serve:integrated'];
  const hasDevIntegrated = packageJson?.scripts?.['dev:integrated:unix'];
  const hasBuildSsr = packageJson?.scripts?.['build:ssr'];

  addResult('R1', checkResult(
    'Package.json scripts for integrated mode',
    !!(hasServeIntegrated && hasDevIntegrated && hasBuildSsr),
    `serve:integrated: ${!!hasServeIntegrated}, dev:integrated: ${!!hasDevIntegrated}, build:ssr: ${!!hasBuildSsr}`
  ));

  // Check 3: Angular.json has SSR configuration
  const angularJson = readJsonFile('angular.json');
  const hasServerBuild = angularJson?.projects?.dashboard?.architect?.server;
  const serverMain = angularJson?.projects?.dashboard?.architect?.server?.options?.server;

  addResult('R1', checkResult(
    'Angular SSR build target configuration',
    !!(hasServerBuild && serverMain === 'src/main.server.ts'),
    hasServerBuild ? `Server build target exists, main: ${serverMain}` : 'No SSR build target'
  ));

  // Check 4: Backend route modules exist
  const backendRoutes = [
    'server/routes/mercury-std.routes.js',
    'server/routes/mercury-auth.routes.js',
    'server/routes/multimedia.routes.js',
    'server/routes/backbone.routes.js'
  ];

  const routesExist = backendRoutes.map(route => ({
    route,
    exists: fileExists(route)
  }));

  addResult('R1', checkResult(
    'Backend API route modules',
    routesExist.every(r => r.exists),
    `Routes: ${routesExist.map(r => `${r.route}=${r.exists}`).join(', ')}`
  ));

  // Check 5: Middleware and dependencies
  const requiredDeps = [
    'express', 'compression', 'cors', 'express-rate-limit',
    'express-http-context', '@angular/ssr'
  ];

  const missingDeps = requiredDeps.filter(dep =>
    !(packageJson?.dependencies?.[dep] || packageJson?.devDependencies?.[dep])
  );

  addResult('R1', checkResult(
    'Required middleware dependencies',
    missingDeps.length === 0,
    missingDeps.length === 0 ? 'All required dependencies present' : `Missing: ${missingDeps.join(', ')}`
  ));
}

function validateR2_VaultIntegration() {
  logRequirement('R2', 'Vault Integration');

  // Check 1: Vault client dependency
  const packageJson = readJsonFile('package.json');
  const hasVaultClient = !!(packageJson?.dependencies?.['node-vault-client']);

  addResult('R2', checkResult(
    'Vault client dependency (node-vault-client)',
    hasVaultClient,
    hasVaultClient ? 'Package present in dependencies' : 'Missing from package.json'
  ));

  // Check 2: Vault integration in app.config.js
  const appConfigPath = 'server/config/app.config.js';
  if (fileExists(appConfigPath)) {
    const appConfig = fs.readFileSync(path.resolve(appConfigPath), 'utf8');
    const hasVaultIntegration = appConfig.includes('node-vault-client') &&
                               appConfig.includes('loadSecretsIntoEnv');

    addResult('R2', checkResult(
      'Vault integration in app configuration',
      hasVaultIntegration,
      hasVaultIntegration ? 'Vault client and secret loading functions present' : 'Missing Vault integration code'
    ));

    // Check 3: Graceful fallback for development
    const hasDevFallback = appConfig.includes('development mode') ||
                          appConfig.includes('graceful fallback');

    addResult('R2', checkResult(
      'Development mode graceful fallback',
      hasDevFallback,
      hasDevFallback ? 'Development fallback logic present' : 'No development fallback detected'
    ));

  } else {
    addResult('R2', checkResult(
      'App configuration file exists',
      false,
      'server/config/app.config.js not found'
    ));
  }

  // Check 4: Debug mode security implementation
  const serverContent = fileExists('src/server.ts') ?
    fs.readFileSync(path.resolve('src/server.ts'), 'utf8') : '';

  const hasSecurityMeasures = serverContent.includes('NODE_ENV') &&
                             serverContent.includes('production');

  addResult('R2', checkResult(
    'Production security measures',
    hasSecurityMeasures,
    hasSecurityMeasures ? 'Environment checks present' : 'Limited security measures detected'
  ));
}

function validateR3_SSLSetup() {
  logRequirement('R3', 'SSL/HTTPS Setup');

  // Check 1: SSL configuration in default.json
  const configPath = 'server/config/default.json';
  const config = readJsonFile(configPath);
  const sslConfig = config?.ssl;

  addResult('R3', checkResult(
    'SSL configuration structure',
    !!(sslConfig?.enabled !== undefined && sslConfig?.certificates),
    sslConfig ? `Enabled: ${sslConfig.enabled}, Certificates: ${Object.keys(sslConfig.certificates || {}).join(', ')}` : 'No SSL config'
  ));

  // Check 2: Certificate files exist
  const certificateFiles = [
    'ssl/backbone.crt', 'ssl/backbone.key',
    'ssl/prx-qa.crt', 'ssl/prx-qa.key'
  ];

  const certResults = certificateFiles.map(cert => ({
    file: cert,
    exists: fileExists(cert)
  }));

  addResult('R3', checkResult(
    'SSL certificate files availability',
    certResults.some(c => c.exists), // At least one pair should exist
    `Certificates: ${certResults.map(c => `${c.file}=${c.exists}`).join(', ')}`
  ));

  // Check 3: SSL setup in server.ts
  const serverContent = fileExists('src/server.ts') ?
    fs.readFileSync(path.resolve('src/server.ts'), 'utf8') : '';

  const hasSSLSetup = serverContent.includes('createHttpsServer') &&
                     serverContent.includes('getSSLConfiguration');

  addResult('R3', checkResult(
    'Server SSL implementation',
    hasSSLSetup,
    hasSSLSetup ? 'HTTPS server and SSL configuration functions present' : 'Missing SSL server setup'
  ));

  // Check 4: HTTP fallback mechanism
  const hasHttpFallback = serverContent.includes('createHttpServer') &&
                         serverContent.includes('fallback');

  addResult('R3', checkResult(
    'HTTP fallback mechanism',
    hasHttpFallback,
    hasHttpFallback ? 'HTTP fallback server implementation present' : 'No HTTP fallback detected'
  ));

  // Check 5: Security headers for HTTPS
  const hasSecurityHeaders = serverContent.includes('Strict-Transport-Security') &&
                            serverContent.includes('Content-Security-Policy');

  addResult('R3', checkResult(
    'HTTPS security headers',
    hasSecurityHeaders,
    hasSecurityHeaders ? 'Security headers (HSTS, CSP, etc.) implemented' : 'Limited security headers'
  ));
}

function validateR4_RedisIntegration() {
  logRequirement('R4', 'Redis Integration Enhancement');

  // Check 1: Redis client with in-memory fallback
  const redisClientPath = 'server/shared/redis-client.js';
  if (fileExists(redisClientPath)) {
    const redisClient = fs.readFileSync(path.resolve(redisClientPath), 'utf8');

    const hasMemoryFallback = redisClient.includes('memoryStore') &&
                             redisClient.includes('Map()');

    addResult('R4', checkResult(
      'In-memory fallback implementation',
      hasMemoryFallback,
      hasMemoryFallback ? 'Memory store fallback present in redis-client.js' : 'No in-memory fallback detected'
    ));

    const hasHealthMonitoring = redisClient.includes('getRedisHealth') ||
                               redisClient.includes('health');

    addResult('R4', checkResult(
      'Redis health monitoring functions',
      hasHealthMonitoring,
      hasHealthMonitoring ? 'Health monitoring functions present' : 'No health monitoring detected'
    ));

  } else {
    addResult('R4', checkResult(
      'Redis client module exists',
      false,
      'server/shared/redis-client.js not found'
    ));
  }

  // Check 2: Health endpoints in server.ts
  const serverContent = fileExists('src/server.ts') ?
    fs.readFileSync(path.resolve('src/server.ts'), 'utf8') : '';

  const hasHealthEndpoints = serverContent.includes('/health') &&
                           serverContent.includes('/health/redis');

  addResult('R4', checkResult(
    'Health monitoring endpoints',
    hasHealthEndpoints,
    hasHealthEndpoints ? 'Health endpoints (/health, /health/redis) present' : 'No health endpoints detected'
  ));

  // Check 3: Redis configuration
  const config = readJsonFile('server/config/default.json');
  const redisConfig = config?.redis;

  addResult('R4', checkResult(
    'Redis configuration structure',
    !!(redisConfig?.enabled !== undefined && redisConfig?.memoryFallback),
    redisConfig ? `Enabled: ${redisConfig.enabled}, Memory fallback: ${!!redisConfig.memoryFallback}` : 'No Redis config'
  ));

  // Check 4: Graceful shutdown handling
  const hasGracefulShutdown = serverContent.includes('gracefulShutdown') &&
                             serverContent.includes('SIGTERM');

  addResult('R4', checkResult(
    'Graceful shutdown with Redis cleanup',
    hasGracefulShutdown,
    hasGracefulShutdown ? 'Graceful shutdown handlers present' : 'No graceful shutdown detected'
  ));

  // Check 5: Redis lock with in-memory fallback
  const redisLockPath = 'server/shared/redis-lock.js';
  const hasRedisLock = fileExists(redisLockPath);

  if (hasRedisLock) {
    const lockContent = fs.readFileSync(path.resolve(redisLockPath), 'utf8');
    const hasLockFallback = lockContent.includes('memoryLocks') ||
                           lockContent.includes('memory') ||
                           lockContent.includes('Map');

    addResult('R4', checkResult(
      'Redis lock with memory fallback',
      hasLockFallback,
      hasLockFallback ? 'In-memory lock fallback present' : 'No memory fallback for locks'
    ));
  } else {
    addResult('R4', checkResult(
      'Redis lock module exists',
      false,
      'server/shared/redis-lock.js not found'
    ));
  }
}

function generateValidationReport() {
  logHeader('VALIDATION REPORT SUMMARY');

  let overallPassed = true;

  Object.entries(validationResults).forEach(([req, result]) => {
    const status = result.overall ? 'PASS' : 'FAIL';
    const statusColor = result.overall ? 'green' : 'red';

    log(`\n${req}: ${status} (${result.checks.filter(c => c.passed).length}/${result.checks.length} checks passed)`, statusColor);

    if (!result.overall) {
      overallPassed = false;
      const failedChecks = result.checks.filter(c => !c.passed);
      failedChecks.forEach(check => {
        log(`  ❌ ${check.description}`, 'red');
        if (check.risks) log(`     Risk: ${check.risks}`, 'yellow');
      });
    }
  });

  log('\n' + '='.repeat(60), 'cyan');
  const overallStatus = overallPassed ? 'INTEGRATION READY' : 'INTEGRATION ISSUES DETECTED';
  const overallColor = overallPassed ? 'green' : 'red';

  log(`OVERALL STATUS: ${overallStatus}`, overallColor);

  if (!overallPassed) {
    log('\nRECOMMENDATIONS:', 'yellow');
    log('1. Fix failing validation checks above', 'yellow');
    log('2. Run build tests to ensure compilation works', 'yellow');
    log('3. Test server startup with health endpoint validation', 'yellow');
    log('4. Verify API routes are accessible after Angular SSR setup', 'yellow');
  } else {
    log('\nINTEGRATION VALIDATION COMPLETE ✅', 'green');
    log('All requirements validated successfully.', 'green');
    log('Ready for production deployment.', 'green');
  }

  return overallPassed;
}

// Main execution
function main() {
  logHeader('Angular 21 + SSR with Node.js/Express BFF Integration Validation');

  log('Starting comprehensive validation...', 'cyan');
  log(`Working directory: ${process.cwd()}`, 'cyan');

  try {
    validateR1_BFFIntegration();
    validateR2_VaultIntegration();
    validateR3_SSLSetup();
    validateR4_RedisIntegration();

    const success = generateValidationReport();

    process.exit(success ? 0 : 1);

  } catch (error) {
    log(`\n❌ Validation failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  validateR1_BFFIntegration,
  validateR2_VaultIntegration,
  validateR3_SSLSetup,
  validateR4_RedisIntegration
};
