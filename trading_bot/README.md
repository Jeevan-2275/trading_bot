# Binance Futures Testnet Trading Bot

A Python trading bot for Binance Futures Testnet (USDT-M) with a full CLI, structured logging, robust error handling, and an optional web dashboard.

---

## Features

- **Market, Limit, and Stop-Market orders** (BUY / SELL)
- **Interactive wizard** or **direct CLI arguments** via `argparse`
- **Structured logging** to `trading_bot.log` with both file and console handlers
- **Input validation** on every parameter before hitting the API
- **Time-offset correction** to prevent `-1021: Timestamp outside recvWindow` errors
- **Test mode** (`--test`) — hits Binance's `/order/test` endpoint for dry runs
- **JSON output mode** (`--json`) — machine-readable output for programmatic use
- **Web Dashboard** — a React dashboard served at `/` for placing orders, viewing history, and tailing logs

---

## Setup

### 1. Get Binance Futures Testnet credentials

1. Register at [Binance Futures Testnet](https://testnet.binancefuture.com)
2. Generate API Key + Secret
3. Copy `.env.example` → `.env` and fill in your credentials:

```env
BINANCE_API_KEY=your_actual_testnet_api_key
BINANCE_API_SECRET=your_actual_testnet_api_secret
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

`requirements.txt`:
```
requests
rich
python-dotenv
```

---

## CLI Usage

### Interactive Wizard (no arguments)

```bash
cd trading_bot
python cli.py
```

Prompts you step-by-step for symbol, side, order type, quantity, price, and dry-run mode.

### Direct Command Mode

```bash
# Dry-run MARKET BUY (safe — no real order)
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.01 --test

# Real LIMIT SELL order
python cli.py --symbol BTCUSDT --side SELL --type LIMIT --quantity 0.01 --price 60000

# STOP_MARKET order
python cli.py --symbol BTCUSDT --side SELL --type STOP_MARKET --quantity 0.01 --stop-price 55000

# JSON output (used by the web dashboard API server)
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.01 --test --json
```

### All Arguments

| Argument | Required | Description |
|---|---|---|
| `--symbol` | Yes | Trading pair (e.g. `BTCUSDT`, `ETHUSDT`) |
| `--side` | Yes | `BUY` or `SELL` |
| `--type` | Yes | `MARKET`, `LIMIT`, or `STOP_MARKET` |
| `--quantity` | Yes | Order quantity (positive float) |
| `--price` | LIMIT only | Limit price |
| `--stop-price` | STOP_MARKET only | Stop trigger price |
| `--test` | No | Dry-run mode (no real trade) |
| `--json` | No | Output result as JSON |

---

## Running Tests

```bash
cd trading_bot
python -m unittest test_bot.py -v
```

Tests cover:
- All validators (symbol, side, order type, quantity, price, stop price)
- HMAC-SHA256 signature generation
- API request/response mocking
- Full order flow (market + limit)

---

## Project Structure

```
trading_bot/
├── bot/
│   ├── __init__.py
│   ├── client.py          # Binance REST API client (HMAC signing, time sync)
│   ├── orders.py          # Order execution logic + step logging
│   ├── validators.py      # Input validation for all order parameters
│   └── logging_config.py  # Dual-handler logging (file + rich console)
├── cli.py                 # CLI entry point (argparse + interactive wizard)
├── test_bot.py            # Unit tests (unittest + mock)
├── generate_test_logs.py  # Mock scenario runner for generating sample logs
├── requirements.txt
├── .env.example
└── trading_bot.log        # Runtime log file (auto-created)
```

---

## Web Dashboard

The enhanced version ships with a React web dashboard at `/`. To use it:

1. Open the app preview
2. Go to **Settings** and enter your Binance Testnet API key and secret
3. Use **Place Order** to place orders via the web UI
4. View **Order History** and **Logs** in real time

The dashboard auto-refreshes every 10 seconds and connects to the API server at `/api`.

---

## Design Assumptions

1. **Time Offset Correction** — Server time is fetched once at client init to prevent timestamp drift errors.
2. **Form-Encoded POST** — Params are sent as `application/x-www-form-urlencoded` per Binance's REST API spec.
3. **GTC for Limit Orders** — Limit orders use `timeInForce: GTC` (Good 'Til Cancelled) as the default.
4. **Graceful Fallbacks** — If `rich` or `python-dotenv` are missing, the CLI falls back to plain print and manual `.env` parsing.
5. **Testnet Only** — The base URL is hardcoded to `https://testnet.binancefuture.com`. Never use real funds on testnet credentials.
6. **Session Credentials** — Credentials saved via the web dashboard Settings page are stored in server memory only (not persisted to disk). Set `BINANCE_API_KEY` / `BINANCE_API_SECRET` env vars for persistent credentials.
