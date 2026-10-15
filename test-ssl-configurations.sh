# SSL Configuration Test
# Test different certificate configurations

echo "=== Testing Production Configuration ==="
NODE_CONFIG_DIR=./server/config NODE_ENV=production node -e "
const config = require('config');
console.log('SSL Config (Production):', JSON.stringify(config.ssl, null, 2));
"

echo ""
echo "=== Testing Development Configuration ==="
NODE_CONFIG_DIR=./server/config NODE_ENV=development node -e "
const config = require('config');
console.log('SSL Config (Development):', JSON.stringify(config.ssl, null, 2));
"

echo ""
echo "=== Testing Environment Variable Override ==="
NODE_CONFIG_DIR=./server/config SSL_ENABLED=false node -e "
const config = require('config');
console.log('SSL Config (SSL_ENABLED=false):', JSON.stringify(config.ssl, null, 2));
"

echo ""
echo "=== Testing Certificate Type Override ==="
NODE_CONFIG_DIR=./server/config SSL_CERTIFICATE_TYPE=prx-qa node -e "
const config = require('config');
console.log('SSL Config (Certificate Type=prx-qa):', JSON.stringify(config.ssl, null, 2));
"
