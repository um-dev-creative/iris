#!/bin/bash
cd "$(dirname "$0")/.." || exit 1

echo "Starting Angular build process..."
echo "Current directory: $(pwd)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Try to build the dashboard project
echo "Building client application..."
npx ng build dashboard --configuration=development

if [ $? -eq 0 ]; then
    echo "✅ Client build successful"

    echo "Building SSR application..."
    npx ng build dashboard --ssr --configuration=development

    if [ $? -eq 0 ]; then
        echo "✅ SSR build successful"
        echo "✅ Build process completed successfully"

        echo "Checking output directory..."
        if [ -d "dist/iris" ]; then
            ls -la dist/iris/
        else
            echo "❌ Output directory not found"
        fi
    else
        echo "❌ SSR build failed"
        exit 1
    fi
else
    echo "❌ Client build failed"
    exit 1
fi
