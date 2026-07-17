#!/usr/bin/env bash
# Render build script — runs from workspace root
set -e

echo "==> Installing Node dependencies..."
pnpm install --frozen-lockfile

echo "==> Installing Python dependencies..."
pip3 install -r trading_bot/requirements.txt || echo "WARNING: Python deps failed, continuing"

echo "==> Building shared TypeScript libs..."
pnpm run typecheck:libs

echo "==> Building React frontend..."
cd artifacts/trading-dashboard
npx vite build --config vite.config.prod.ts
cd ../..

echo "==> Copying frontend into public dir for Express to serve..."
mkdir -p artifacts/api-server/public
cp -r artifacts/trading-dashboard/dist/. artifacts/api-server/public/

echo "==> Build complete!"
