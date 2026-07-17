import { Router } from "express";
import { createHmac } from "crypto";

const router = Router();
const BINANCE_BASE = "https://testnet.binancefuture.com";

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

// GET /api/market/prices — live 24hr ticker for BTC, ETH, BNB (public, no auth)
router.get("/prices", async (_req, res) => {
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
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
      })
    );
    return res.json(results.filter(Boolean));
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch market prices" });
  }
});

// GET /api/account/balance — signed request for USDT balance
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

    // Return relevant assets
    const relevant = balances.filter((b) =>
      ["USDT", "BNB", "BTC", "ETH"].includes(b.asset)
    );

    return res.json(
      relevant.map((b) => ({
        asset: b.asset,
        balance: parseFloat(b.balance),
        available: parseFloat(b.availableBalance),
        unrealizedPnl: parseFloat(b.crossUnPnl),
      }))
    );
  } catch (err) {
    return res.status(502).json({ error: "Network error fetching balance" });
  }
});

export { router as marketRouter };
