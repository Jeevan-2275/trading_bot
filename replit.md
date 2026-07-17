# Binance Futures Testnet Trading Bot

A Python trading bot for Binance Futures Testnet (USDT-M) with CLI, web dashboard, order history, and live log viewer.

## Run & Operate

- **Web dashboard**: served at `/` (preview pane) — React frontend
- **API server**: `pnpm --filter @workspace/api-server run dev` — Express on port 8080, served at `/api`
- **Python CLI**: `cd trading_bot && python cli.py` — interactive or argument-driven order placement
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `cd trading_bot && python -m unittest test_bot.py -v` — run Python unit tests

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9, Python 3.11
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Python bot: requests + rich + python-dotenv
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `trading_bot/` — Python trading bot (CLI entry: `trading_bot/cli.py`)
  - `trading_bot/bot/client.py` — Binance REST API client with HMAC signing
  - `trading_bot/bot/orders.py` — order execution with step-by-step logging
  - `trading_bot/bot/validators.py` — input validation
  - `trading_bot/bot/logging_config.py` — file + console logging
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/orders.ts` — orders table schema
- `artifacts/api-server/src/routes/` — Express route handlers (orders, logs, credentials, stats)
- `artifacts/trading-dashboard/src/` — React dashboard
- `trading_bot/trading_bot.log` — bot log file (auto-created on first run)

## Architecture decisions

- **Python CLI + Node.js proxy**: The Express API server spawns the Python CLI as a child process with `--json` flag, capturing structured output and persisting results to PostgreSQL.
- **Session-only credential storage**: API keys entered via the Settings page are stored in server process memory (`process.env`). For persistence, set `BINANCE_API_KEY` / `BINANCE_API_SECRET` as environment secrets.
- **OpenAPI-first**: All API contracts are defined in `lib/api-spec/openapi.yaml` and code-generated into typed React Query hooks and Zod schemas.
- **Log file parsing**: The `/api/logs` endpoint reads and parses `trading_bot/trading_bot.log` on each request (no database for logs).

## Product

- Place MARKET, LIMIT, and STOP_MARKET orders on Binance Futures Testnet via web UI or CLI
- Real-time dashboard with stats, recent orders, and log tail
- Full order history with search and status filtering
- Log viewer with level filtering (INFO, DEBUG, WARNING, ERROR)
- Settings page for configuring Binance API credentials

## User preferences

_Populate as you build._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before artifact typechecks, then `pnpm --filter @workspace/db run push`.
- Python CLI must be called from `trading_bot/` directory (or with `PYTHONPATH=trading_bot`).
- The `--json` flag suppresses all Rich/console output and prints a single JSON object to stdout.
- Binance Testnet credentials are different from mainnet — never cross-contaminate.
