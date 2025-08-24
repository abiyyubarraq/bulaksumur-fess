#!/bin/bash

# Local testing script (no Docker required)
# Usage: ./test-local.sh

echo "🧪 Testing local build..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your environment variables"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the application
echo "🔨 Building application..."
bun run build:prod

# Test the build
echo "✅ Build completed successfully!"
echo "📁 Built files are in the dist/ directory"
echo ""
echo "🚀 To deploy to VPS:"
echo "1. Copy .env to VPS: ./copy-env.sh your-vps-ip"
echo "2. SSH to VPS and run: ./docker-deploy.sh"
