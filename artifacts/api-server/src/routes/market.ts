import { Router } from "express";
import { createHmac } from "crypto";

const router = Router();
const BINANCE_BASE = "https://testnet.binancefuture.com";

const ALL_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];

function sign(secret: string, qs: string): string {
  return createHmac("sha256", secret).update(qs).digest("hex");
}

async function getTimeOffset(): Promise<number> {
  try {
    const before = Date.now();
    const res = await fetch(`${BINANCE_BASE}/fapi/v1/time`);
    const after = Date.now();
    if (!res.ok) return 0;
    const data = (await res.json()) as { serverTime: number };
    return data.serverTime - (before + Math.floor((after - before) / 2));
  } catch {
    return 0;
  }
}

// GET /api/market/prices — live 24hr ticker for all tracked pairs
router.get("/prices", async (_req, res) => {
  try {
    const results = await Promise.all(
      ALL_SYMBOLS.map(async (symbol) => {
        try {
          const r = await fetch(`${BINANCE_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`);
          if (!r.ok) return null;
          const d = (await r.json()) as {
            symbol: string;
            lastPrice: string;
            priceChangePercent: string;
            priceChange: string;
            highPrice: string;
            lowPrice: string;
            volume: string;
          };
          return {
            symbol: d.symbol,
            price: parseFloat(d.lastPrice),
            change: parseFloat(d.priceChange),
            changePercent: parseFloat(d.priceChangePercent),
            high: parseFloat(d.highPrice),
            low: parseFloat(d.lowPrice),
            volume: parseFloat(d.volume),
          };
        } catch {
          return null;
        }
      })
    );
    return res.json(results.filter(Boolean));
  } catch {
    return res.status(502).json({ error: "Failed to fetch market prices" });
  }
});

// GET /api/market/klines — OHLCV candlestick data
router.get("/klines", async (req, res) => {
  const symbol = String(req.query.symbol || "BTCUSDT").toUpperCase();
  const interval = String(req.query.interval || "1h");
  const limit = Math.min(parseInt(String(req.query.limit || "100")), 500);

  const validIntervals = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
  if (!validIntervals.includes(interval)) {
    return res.status(400).json({ error: "Invalid interval" });
  }

  try {
    const url = `${BINANCE_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const r = await fetch(url);
    if (!r.ok) {
      const err = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return res.status(r.status).json({ error: err.msg ?? "Failed to fetch klines" });
    }
    const raw = (await r.json()) as Array<[number, string, string, string, string, string, number]>;
    const klines = raw.map((k) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
    }));
    return res.json(klines);
  } catch {
    return res.status(502).json({ error: "Failed to fetch klines" });
  }
});

// GET /api/market/balance — signed request for account balance
router.get("/balance", async (_req, res) => {
  const apiKey = process.env.BINANCE_API_KEY || "";
  const apiSecret = process.env.BINANCE_API_SECRET || "";

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ error: "API credentials not configured" });
  }

  try {
    const offset = await getTimeOffset();
    const timestamp = Date.now() + offset;
    const qs = `timestamp=${timestamp}`;
    const signature = sign(apiSecret, qs);

    const r = await fetch(`${BINANCE_BASE}/fapi/v2/balance?${qs}&signature=${signature}`, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    if (!r.ok) {
      const err = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return res.status(r.status).json({ error: err.msg ?? "Failed to fetch balance" });
    }

    const balances = (await r.json()) as Array<{
      asset: string;
      balance: string;
      availableBalance: string;
      crossUnPnl: string;
    }>;

    const relevant = balances.filter((b) =>
      ["USDT", "BNB", "BTC", "ETH", "SOL", "XRP"].includes(b.asset)
    );

    return res.json(
      relevant.map((b) => ({
        asset: b.asset,
        balance: parseFloat(b.balance),
        available: parseFloat(b.availableBalance),
        unrealizedPnl: parseFloat(b.crossUnPnl),
      }))
    );
  } catch {
    return res.status(502).json({ error: "Network error fetching balance" });
  }
});

export { router as marketRouter };
