import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, journalTable, alertsTable } from "@workspace/db/schema";
import { count } from "drizzle-orm";

const seedRouter = Router();

const randBetween = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(randBetween(lo, hi + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const fmt = (n: number, dp = 2) => n.toFixed(dp);

const BASE: Record<string, number> = {
  BTCUSDT: 64500, ETHUSDT: 1870, BNBUSDT: 570, SOLUSDT: 76,
  XRPUSDT: 1.10, ADAUSDT: 0.38, DOGEUSDT: 0.12, AVAXUSDT: 27,
};

const QTY: Record<string, () => string> = {
  BTCUSDT:  () => fmt(randBetween(0.001, 0.05), 4),
  ETHUSDT:  () => fmt(randBetween(0.05, 1.5), 4),
  BNBUSDT:  () => fmt(randBetween(0.5, 5), 4),
  SOLUSDT:  () => fmt(randBetween(1, 20), 4),
  XRPUSDT:  () => fmt(randBetween(50, 500), 4),
  ADAUSDT:  () => fmt(randBetween(100, 2000), 4),
  DOGEUSDT: () => fmt(randBetween(500, 5000), 4),
  AVAXUSDT: () => fmt(randBetween(2, 30), 4),
};

seedRouter.get("/seed", async (req, res) => {
  try {
    const force = req.query.force === "true";

    // Idempotency check (skip if data exists, unless force=true)
    const [{ value: existingCount }] = await db.select({ value: count() }).from(ordersTable);
    if (existingCount > 0 && !force) {
      res.json({ ok: true, message: `Database already has ${existingCount} orders — skipping seed. Use ?force=true to reseed.` });
      return;
    }

    // Clear existing data when forcing
    if (force && existingCount > 0) {
      await db.delete(ordersTable);
      await db.delete(journalTable);
      await db.delete(alertsTable);
    }

    const symbols = Object.keys(BASE);
    const sides = ["BUY", "SELL"];
    const types = ["MARKET", "LIMIT", "MARKET", "MARKET"];

    // 120 orders over 90 days
    for (let i = 0; i < 120; i++) {
      const symbol = pick(symbols);
      const side = pick(sides);
      const orderType = pick(types);
      const daysBack = randInt(0, 89);
      const hoursBack = randInt(0, 23);
      const ts = daysAgo(daysBack);
      ts.setHours(ts.getHours() - hoursBack);
      const drift = 1 + (Math.random() - 0.5) * 0.16;
      const price = BASE[symbol] * drift;
      const avgPrice = price * (1 + (Math.random() - 0.5) * 0.002);
      const qty = QTY[symbol]();

      await db.insert(ordersTable).values({
        symbol, side, orderType, quantity: qty,
        price: fmt(price, 4), avgPrice: fmt(avgPrice, 4),
        testMode: false, status: "FILLED",
        orderId: `SEED${Date.now()}${i}`, executedQty: qty,
        createdAt: ts,
      });
    }

    // Journal entries
    const journalEntries = [
      { title: "Strong BTC breakout — rode the momentum", notes: "Clear break above $64k with volume confirmation. Entered long at $63,800, closed at $65,200. Trend continuation play. Setup was clean, execution was on point.", tags: "BTC,breakout,momentum,trend", sentiment: "bullish", days: 3 },
      { title: "ETH scalp — quick 0.8% on news spike", notes: "ETH pumped on a tweet from a major influencer. Caught the initial wave and exited before the pullback. Risk was minimal since I was already watching the order book depth.", tags: "ETH,scalp,news,quick", sentiment: "bullish", days: 7 },
      { title: "Lesson: don't fight the trend on SOL", notes: "Tried to short SOL at what I thought was resistance. Got squeezed up 4%. Classic mistake — RSI was overbought but momentum was too strong. Need to wait for confirmation before fading moves like this.", tags: "SOL,loss,lesson,short-squeeze", sentiment: "bearish", days: 12 },
      { title: "BNB range trade — textbook support play", notes: "BNB bounced perfectly off the $560 support that's held for 3 sessions. Entered with tight stop below $558, target at $572. Clean 2:1 R:R. Exited at $570.", tags: "BNB,range,support,risk-reward", sentiment: "neutral", days: 18 },
      { title: "XRP news spike — partial fill, partial miss", notes: "XRP spiked on SEC news but my limit order only got a partial fill before price moved away. Lesson: in news-driven moves, use market orders or set limits wider.", tags: "XRP,news,partial-fill,lesson", sentiment: "neutral", days: 25 },
      { title: "DOGE volatility — size was too big", notes: "DOGE whipsawed me twice in the same session. My position size was too large for the volatility. Even though I was directionally right, the noise stopped me out before the real move.", tags: "DOGE,volatility,position-size,lesson", sentiment: "bearish", days: 30 },
      { title: "Weekly review — best week in a month", notes: "7 trades, 5 winners. Win rate 71%. Total P&L positive. BTC and ETH longs drove the gains. Need to continue being selective — my losing trades came from chasing setups that weren't fully formed.", tags: "weekly-review,BTC,ETH", sentiment: "bullish", days: 35 },
    ];

    for (const e of journalEntries) {
      await db.insert(journalTable).values({
        title: e.title, notes: e.notes, tags: e.tags,
        sentiment: e.sentiment, updatedAt: daysAgo(e.days), createdAt: daysAgo(e.days),
      });
    }

    // Price alerts
    const alerts = [
      { symbol: "BTCUSDT", targetPrice: "68000", direction: "ABOVE", message: "BTC all-time high retest", triggered: false },
      { symbol: "BTCUSDT", targetPrice: "60000", direction: "BELOW", message: "BTC key support break — exit longs", triggered: false },
      { symbol: "ETHUSDT", targetPrice: "2000",  direction: "ABOVE", message: "ETH psychological level — watch for reversal", triggered: false },
      { symbol: "ETHUSDT", targetPrice: "1800",  direction: "BELOW", message: "ETH support — potential long entry", triggered: false },
      { symbol: "SOLUSDT", targetPrice: "85",    direction: "ABOVE", message: "SOL breakout target", triggered: false },
      { symbol: "BNBUSDT", targetPrice: "550",   direction: "BELOW", message: "BNB major support re-test", triggered: false },
      { symbol: "XRPUSDT", targetPrice: "1.25",  direction: "ABOVE", message: "XRP breakout — momentum entry", triggered: false },
      { symbol: "BTCUSDT", targetPrice: "63000", direction: "BELOW", message: "BTC short-term support", triggered: true },
    ];

    for (const a of alerts) {
      await db.insert(alertsTable).values({
        symbol: a.symbol, targetPrice: a.targetPrice,
        direction: a.direction, message: a.message, triggered: a.triggered,
      });
    }

    res.json({ ok: true, message: "✅ Seeded 120 orders, 7 journal entries, 8 alerts." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default seedRouter;
