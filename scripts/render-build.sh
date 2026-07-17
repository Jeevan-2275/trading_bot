#!/usr/bin/env bash
# Render build script — runs from workspace root
set -e

echo "==> Installing Node dependencies..."
pnpm install --frozen-lockfile

echo "==> Installing Python dependencies..."
pip3 install -r trading_bot/requirements.txt

echo "==> Building shared TypeScript libs..."
pnpm run typecheck:libs

echo "==> Building React frontend..."
cd artifacts/trading-dashboard
npx vite build --config vite.config.prod.ts
cd ../..

echo "==> Building Express API server..."
cd artifacts/api-server
node build.mjs
cd ../..

echo "==> Copying frontend into API server dist/public..."
mkdir -p artifacts/api-server/dist/public
cp -r artifacts/trading-dashboard/dist/. artifacts/api-server/dist/public/

echo "==> Skipping database migrations (will run at startup)..."

echo "==> Build complete!"
