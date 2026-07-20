import { Router } from "express";

const router = Router();
const BINANCE_BASE = "https://testnet.binancefuture.com";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

async function fetchKlines(symbol: string, interval = "1h", limit = 60): Promise<Kline[]> {
  try {
    const url = `${BINANCE_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const raw = (await r.json()) as Array<[number, string, string, string, string, string, number]>;
    return raw.map((k) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
    }));
  } catch {
    return [];
  }
}

function sma(values: number[], period: number): number {
  if (values.length < period) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [];
    let prev = data[0];
    for (const v of data) {
      const e = v * k + prev * (1 - k);
      result.push(e);
      prev = e;
    }
    return result;
  };
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine.slice(-9), 9);
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return {
    macd: Math.round(lastMacd * 10000) / 10000,
    signal: Math.round(lastSignal * 10000) / 10000,
    histogram: Math.round((lastMacd - lastSignal) * 10000) / 10000,
  };
}

function analyzeSignal(klines: Kline[], symbol: string) {
  const closes = klines.map((k) => k.close);
  const currentPrice = closes[closes.length - 1];

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const currentRsi = rsi(closes, 14);
  const { macd: macdVal, signal: signalVal, histogram } = macd(closes);

  // Score: -100 (strong sell) to +100 (strong buy)
  let score = 0;
  const reasons: string[] = [];

  // SMA crossover
  if (sma20 > sma50) {
    score += 30;
    reasons.push("SMA20 > SMA50 (bullish trend)");
  } else if (sma20 < sma50) {
    score -= 30;
    reasons.push("SMA20 < SMA50 (bearish trend)");
  }

  // RSI
  if (currentRsi < 30) {
    score += 35;
    reasons.push(`RSI ${currentRsi.toFixed(1)} — oversold`);
  } else if (currentRsi > 70) {
    score -= 35;
    reasons.push(`RSI ${currentRsi.toFixed(1)} — overbought`);
  } else if (currentRsi >= 45 && currentRsi <= 55) {
    reasons.push(`RSI ${currentRsi.toFixed(1)} — neutral`);
  } else if (currentRsi > 55) {
    score += 10;
    reasons.push(`RSI ${currentRsi.toFixed(1)} — bullish momentum`);
  } else {
    score -= 10;
    reasons.push(`RSI ${currentRsi.toFixed(1)} — bearish momentum`);
  }

  // MACD
  if (histogram > 0) {
    score += 20;
    reasons.push("MACD histogram positive");
  } else if (histogram < 0) {
    score -= 20;
    reasons.push("MACD histogram negative");
  }

  // Price vs SMAs
  if (currentPrice > sma20 && currentPrice > sma50) {
    score += 15;
    reasons.push("Price above both SMAs");
  } else if (currentPrice < sma20 && currentPrice < sma50) {
    score -= 15;
    reasons.push("Price below both SMAs");
  }

  const signal = score > 25 ? "BUY" : score < -25 ? "SELL" : "NEUTRAL";
  const strength = Math.min(100, Math.abs(score));

  return {
    symbol,
    signal,
    strategy: "MA Crossover + RSI + MACD",
    strength,
    reason: reasons.join("; ") || "No clear signal",
    price: currentPrice,
    rsi: Math.round(currentRsi * 10) / 10,
    sma20: Math.round(sma20 * 100) / 100,
    sma50: Math.round(sma50 * 100) / 100,
    macd: macdVal,
    macdSignal: signalVal,
    macdHistogram: histogram,
    timestamp: new Date().toISOString(),
  };
}

// GET /api/strategies/signals
router.get("/signals", async (_req, res) => {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async (symbol) => {
        const klines = await fetchKlines(symbol, "1h", 60);
        if (klines.length < 51) {
          return {
            symbol,
            signal: "NEUTRAL" as const,
            strategy: "MA Crossover + RSI + MACD",
            strength: 0,
            reason: "Insufficient data",
            price: 0,
            rsi: 50,
            sma20: 0,
            sma50: 0,
            timestamp: new Date().toISOString(),
          };
        }
        return analyzeSignal(klines, symbol);
      })
    );
    return res.json(results);
  } catch {
    return res.status(502).json({ error: "Failed to compute strategy signals" });
  }
});

export { router as strategiesRouter };
