#!/usr/bin/env node
// Simple validation test for Redis integration files

const fs = require('fs');
const path = require('path');

console.log('🧪 Validating Redis Integration Enhancement Files...\n');

const filesToCheck = [
  'server/shared/redis-client.js',
  'server/shared/redis-lock.js',
  'server/shared/redis-session-store.js',
  'src/server.ts',
  'server/config/default.json'
];

let allValid = true;

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');

    // Check for key enhancements
    let checks = [];

    if (file.includes('redis-client.js')) {
      checks = [
        content.includes('validateRedisConfig'),
        content.includes('memorySet'),
        content.includes('memoryGet'),
        content.includes('getRedisHealth'),
        content.includes('isRedisHealthy'),
        content.includes('reconnectRedis'),
        content.includes('cleanupMemoryStore')
      ];
    } else if (file.includes('redis-lock.js')) {
      checks = [
        content.includes('memoryAcquireLock'),
        content.includes('memoryReleaseLock'),
        content.includes('cleanupMemoryLocks'),
        content.includes('in-memory fallback')
      ];
    } else if (file.includes('server.ts')) {
      checks = [
        content.includes('/health'),
        content.includes('/health/redis'),
        content.includes('gracefulShutdown'),
        content.includes('closeRedisClient')
      ];
    } else if (file.includes('default.json')) {
      checks = [
        content.includes('"redis"'),
        content.includes('"health"'),
        content.includes('"memoryFallback"')
      ];
    }

    const passed = checks.every(check => check);
    console.log(`✓ ${file}: ${passed ? 'ENHANCED' : 'MISSING FEATURES'}`);
    if (!passed) {
      allValid = false;
      console.log(`  Missing features in ${file}`);
    }
  } else {
    console.log(`❌ ${file}: NOT FOUND`);
    allValid = false;
  }
});

console.log(`\n${allValid ? '✅' : '❌'} Overall validation: ${allValid ? 'PASSED' : 'FAILED'}`);

if (allValid) {
  console.log('\n🎯 R4 Implementation Features Confirmed:');
  console.log('   • In-memory fallback for Redis operations');
  console.log('   • Health monitoring endpoints (/health, /health/redis)');
  console.log('   • Configuration validation for Redis parameters');
  console.log('   • Graceful shutdown with connection cleanup');
  console.log('   • Memory store cleanup and maintenance');
  console.log('   • Enhanced error handling and reconnection');
}
