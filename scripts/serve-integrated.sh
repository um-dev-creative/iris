#!/bin/bash
cd "$(dirname "$0")/.." || exit 1

echo "=== Starting Integrated Development Environment ==="
echo "This will build and serve the Angular app with integrated backend"
echo ""

# Build the application first (SSR build)
echo "Building the application with SSR..."
pnpm run build:ssr

if [ $? -eq 0 ]; then
    echo "✓ Build successful"
    echo ""
    echo "Starting the consolidated SSR server..."
    echo "The server will be available at:"
    echo "  - HTTPS: https://localhost:4001"
    echo "  - HTTP:  http://localhost:4000 (redirects to HTTPS)"
    echo ""
    echo "Backend APIs will be available at:"
    echo "  - Mercury Standard: /mrc/api/v1/general/*"
    echo "  - Mercury Auth: /mrc/api/v1/auth/*"
    echo "  - Multimedia: /mrc/api/v1/d-image/*"
    echo "  - Backbone: /bkd/api/v1/*"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "==========================================="

    node server.js
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
