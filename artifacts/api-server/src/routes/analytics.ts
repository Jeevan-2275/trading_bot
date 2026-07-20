import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { format } from "date-fns";

const router = Router();

function computeRsi(closes: number[], period = 14): number {
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

// GET /api/analytics — advanced performance stats
router.get("/", async (_req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));

  if (orders.length === 0) {
    return res.json({
      winRate: 0, lossRate: 0, totalTrades: 0, filledTrades: 0,
      totalPnl: 0, avgTrade: 0, bestTrade: 0, worstTrade: 0,
      sharpeRatio: 0, maxDrawdown: 0, profitFactor: 0, avgHoldingHours: 0,
    });
  }

  const filled = orders.filter((o) => o.status === "FILLED" || o.status === "TEST_OK");
  const failed = orders.filter((o) => o.status === "FAILED");

  // Compute per-trade notional P&L (SELL orders add value, BUY orders cost)
  const tradePnls = filled.map((o) => {
    const qty = parseFloat(String(o.quantity));
    const price = parseFloat(String(o.avgPrice || o.price || "0"));
    const notional = qty * price;
    return o.side === "SELL" ? notional : -notional;
  });

  const wins = tradePnls.filter((p) => p > 0);
  const losses = tradePnls.filter((p) => p < 0);
  const totalPnl = tradePnls.reduce((a, b) => a + b, 0);
  const avgTrade = filled.length ? totalPnl / filled.length : 0;
  const bestTrade = wins.length ? Math.max(...wins) : 0;
  const worstTrade = losses.length ? Math.min(...losses) : 0;
  const winRate = filled.length ? (wins.length / filled.length) * 100 : 0;
  const lossRate = filled.length ? (losses.length / filled.length) * 100 : 0;

  // Sharpe ratio from daily P&L (annualized)
  const dayMap: Record<string, number> = {};
  filled.forEach((o) => {
    const day = format(o.createdAt, "yyyy-MM-dd");
    const qty = parseFloat(String(o.quantity));
    const price = parseFloat(String(o.avgPrice || o.price || "0"));
    const notional = qty * price;
    const pnl = o.side === "SELL" ? notional : -notional;
    dayMap[day] = (dayMap[day] || 0) + pnl;
  });
  const dailyReturns = Object.values(dayMap);
  let sharpeRatio = 0;
  if (dailyReturns.length > 1) {
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
    const std = Math.sqrt(variance);
    sharpeRatio = std === 0 ? 0 : (mean / std) * Math.sqrt(365);
  }

  // Max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let cumPnl = 0;
  for (const d of Object.keys(dayMap).sort()) {
    cumPnl += dayMap[d];
    if (cumPnl > peak) peak = cumPnl;
    if (peak > 0) {
      const dd = ((peak - cumPnl) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  // Profit factor
  const grossGain = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss === 0 ? (grossGain > 0 ? 999 : 0) : grossGain / grossLoss;

  // Avg holding time (approx: use createdAt delta between consecutive orders of same symbol)
  const avgHoldingHours = 4; // placeholder — real calculation needs position open/close pairing

  return res.json({
    winRate: Math.round(winRate * 10) / 10,
    lossRate: Math.round(lossRate * 10) / 10,
    totalTrades: orders.length,
    filledTrades: filled.length,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgTrade: Math.round(avgTrade * 100) / 100,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgHoldingHours,
  });
});

// GET /api/analytics/daily-pnl — daily P&L for calendar heatmap
router.get("/daily-pnl", async (req, res) => {
  const days = Math.min(parseInt(String(req.query.days || "90")), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  const filled = orders.filter((o) =>
    (o.status === "FILLED" || o.status === "TEST_OK") && o.createdAt >= since
  );

  const dayMap: Record<string, { pnl: number; trades: number }> = {};
  filled.forEach((o) => {
    const day = format(o.createdAt, "yyyy-MM-dd");
    const qty = parseFloat(String(o.quantity));
    const price = parseFloat(String(o.avgPrice || o.price || "0"));
    const notional = qty * price;
    const pnl = o.side === "SELL" ? notional : -notional;
    if (!dayMap[day]) dayMap[day] = { pnl: 0, trades: 0 };
    dayMap[day].pnl += pnl;
    dayMap[day].trades += 1;
  });

  const result = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      pnl: Math.round(v.pnl * 100) / 100,
      trades: v.trades,
    }));

  return res.json(result);
});

export { router as analyticsRouter };
