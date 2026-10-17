#!/bin/bash
cd "$(dirname "$0")/.." || exit 1

echo "Starting integrated development server..."
echo "Current directory: $(pwd)"

# Check if concurrently is available
if command -v npx >/dev/null 2>&1; then
    echo "✓ npx is available"

    # Test concurrently
    echo "Testing concurrently availability..."
    npx concurrently --version

    if [ $? -eq 0 ]; then
        echo "✓ concurrently is working"

        echo "Starting consolidated development server..."
        echo "This will run:"
        echo "  1. Angular SSR watch mode (pnpm run watch:ssr)"
        echo "  2. SSR server with backend integration"

        pnpm run dev:integrated:unix
    else
        echo "❌ concurrently is not working properly"
        echo "Trying to install concurrently..."
        pnpm add -D concurrently
        echo "Please try running the script again"
    fi
else
    echo "❌ npx is not available"
    echo "Please ensure Node.js and npm/pnpm are properly installed"
fi
