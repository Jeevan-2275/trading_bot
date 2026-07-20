#!/usr/bin/env bash
# Render build script — runs from workspace root
set -e

echo "==> Installing Node dependencies..."
pnpm install --frozen-lockfile

echo "==> Installing Python dependencies into ./python_packages (portable across build/runtime)..."
pip3 install --target=./python_packages -r trading_bot/requirements.txt || echo "WARNING: Python deps failed, continuing"

echo "==> Building shared TypeScript libs..."
pnpm run typecheck:libs

echo "==> Building API server..."
pnpm --filter @workspace/api-server run build

echo "==> Building React frontend..."
cd artifacts/trading-dashboard
npx vite build --config vite.config.prod.ts
cd ../..

echo "==> Copying frontend into public dir for Express to serve..."
mkdir -p artifacts/api-server/dist/public
cp -r artifacts/trading-dashboard/dist/. artifacts/api-server/dist/public/

echo "==> Pushing database schema..."
pnpm --filter @workspace/db run push || echo "WARNING: DB push failed, the schema may already be up to date"

echo "==> Seeding dummy data (skipped automatically if data already exists)..."
node scripts/seed-dummy-data.mjs || echo "WARNING: Seed failed, continuing"

echo "==> Build complete!"
