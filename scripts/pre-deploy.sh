#!/bin/bash

# Pre-deployment checks for Meraki MCP Cloudflare Worker
set -e

echo "🔍 Running pre-deployment checks..."

echo "📋 Step 1: Checking code formatting and linting..."
if ! npm run lint; then
    echo "❌ Linting failed. Run 'npm run lint:fix' to auto-fix issues."
    exit 1
fi

echo "🔨 Step 2: Building TypeScript..."
npm run build

echo "🧪 Step 3: Running tests..."
npm run test

echo "🔍 Step 4: Type checking..."
npx tsc --noEmit

echo "✅ All pre-deployment checks passed!"
echo "Ready to deploy with: npm run deploy"