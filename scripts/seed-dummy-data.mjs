/**
 * Seed realistic dummy trading data for dashboard demo.
 * Run: node scripts/seed-dummy-data.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const { Client } = pg;

// Read DB URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

// ─── helpers ──────────────────────────────────────────────────────────────────
const randBetween = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(randBetween(lo, hi + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const fmt = (n, dp = 2) => n.toFixed(dp);

// ─── base prices (approximate current testnet) ────────────────────────────────
const BASE = {
  BTCUSDT: 64500,
  ETHUSDT: 1870,
  BNBUSDT: 570,
  SOLUSDT: 76,
  XRPUSDT: 1.10,
  ADAUSDT: 0.38,
  DOGEUSDT: 0.12,
  AVAXUSDT: 27,
};

const QTY = {
  BTCUSDT:  () => fmt(randBetween(0.001, 0.05), 4),
  ETHUSDT:  () => fmt(randBetween(0.05, 1.5), 4),
  BNBUSDT:  () => fmt(randBetween(0.5, 5), 4),
  SOLUSDT:  () => fmt(randBetween(1, 20), 4),
  XRPUSDT:  () => fmt(randBetween(50, 500), 4),
  ADAUSDT:  () => fmt(randBetween(100, 2000), 4),
  DOGEUSDT: () => fmt(randBetween(500, 5000), 4),
  AVAXUSDT: () => fmt(randBetween(2, 30), 4),
};

// ─── generate 120 filled orders spread over 90 days ──────────────────────────
const symbols = Object.keys(BASE);
const sides = ["BUY", "SELL"];
const types = ["MARKET", "LIMIT", "MARKET", "MARKET"]; // bias toward MARKET

const orders = [];
for (let i = 0; i < 120; i++) {
  const symbol = pick(symbols);
  const side = pick(sides);
  const type = pick(types);
  const daysBack = randInt(0, 89);
  const hoursBack = randInt(0, 23);
  const ts = daysAgo(daysBack);
  ts.setHours(ts.getHours() - hoursBack);

  // price drifts ±8% from base
  const drift = 1 + (Math.random() - 0.5) * 0.16;
  const price = BASE[symbol] * drift;
  const avgPrice = price * (1 + (Math.random() - 0.5) * 0.002); // tiny slippage
  const qty = QTY[symbol]();

  orders.push({
    symbol,
    side,
    orderType: type,
    quantity: qty,
    price: fmt(price, 4),
    avgPrice: fmt(avgPrice, 4),
    testMode: false,
    status: "FILLED",
    orderId: `${Date.now()}${i}`,
    executedQty: qty,
    createdAt: ts,
  });
}

// insert orders
for (const o of orders) {
  await client.query(
    `INSERT INTO orders (symbol, side, order_type, quantity, price, avg_price, test_mode, status, order_id, executed_qty, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [o.symbol, o.side, o.orderType, o.quantity, o.price, o.avgPrice,
     o.testMode, o.status, o.orderId, o.executedQty, o.createdAt]
  );
}
console.log(`✓ Inserted ${orders.length} orders`);

// ─── journal entries ──────────────────────────────────────────────────────────
const journalEntries = [
  {
    title: "Strong BTC breakout — rode the momentum",
    notes: "Clear break above $64k with volume confirmation. Entered long at $63,800, closed at $65,200. Trend continuation play following the morning consolidation. Setup was clean, execution was on point.",
    tags: "BTC,breakout,momentum,trend",
    sentiment: "bullish",
    daysAgo: 3,
  },
  {
    title: "ETH scalp — quick 0.8% on news spike",
    notes: "ETH pumped on a tweet from a major influencer. Caught the initial wave and exited before the pullback. Risk was minimal since I was already watching the order book depth for that level.",
    tags: "ETH,scalp,news,quick",
    sentiment: "bullish",
    daysAgo: 7,
  },
  {
    title: "Lesson: don't fight the trend on SOL",
    notes: "Tried to short SOL at what I thought was resistance. Got squeezed up 4%. Classic mistake — RSI was overbought but momentum was too strong. Need to wait for confirmation before fading moves like this.",
    tags: "SOL,loss,lesson,short-squeeze",
    sentiment: "bearish",
    daysAgo: 12,
  },
  {
    title: "BNB range trade — textbook support play",
    notes: "BNB bounced perfectly off the $560 support that's held for 3 sessions. Entered with a tight stop below $558, target at $572. Clean 2:1 R:R. Exited at $570 before resistance hit.",
    tags: "BNB,range,support,risk-reward",
    sentiment: "neutral",
    daysAgo: 18,
  },
  {
    title: "XRP news spike — partial fill, partial miss",
    notes: "XRP spiked on SEC news but my limit order only got a partial fill before price moved away. Ended up with 40% of intended size. Lesson: in news-driven moves, use market orders or set limits wider.",
    tags: "XRP,news,partial-fill,lesson",
    sentiment: "neutral",
    daysAgo: 25,
  },
  {
    title: "DOGE volatility — size was too big",
    notes: "DOGE whipsawed me twice in the same session. My position size was too large for the volatility. Even though I was directionally right, the noise stopped me out before the real move. Reduce size on meme coins.",
    tags: "DOGE,volatility,position-size,lesson",
    sentiment: "bearish",
    daysAgo: 30,
  },
  {
    title: "Weekly review — best week in a month",
    notes: "7 trades, 5 winners. Win rate 71%. Total P&L positive. BTC and ETH longs drove the gains. Need to continue being selective — my losing trades came from chasing setups that weren't fully formed.",
    tags: "weekly-review,review,BTC,ETH",
    sentiment: "bullish",
    daysAgo: 35,
  },
];

for (const e of journalEntries) {
  const ts = daysAgo(e.daysAgo);
  await client.query(
    `INSERT INTO journal_entries (title, notes, tags, sentiment, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$5)`,
    [e.title, e.notes, e.tags, e.sentiment, ts]
  );
}
console.log(`✓ Inserted ${journalEntries.length} journal entries`);

// ─── price alerts ─────────────────────────────────────────────────────────────
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
  await client.query(
    `INSERT INTO alerts (symbol, target_price, direction, message, triggered)
     VALUES ($1,$2,$3,$4,$5)`,
    [a.symbol, a.targetPrice, a.direction, a.message, a.triggered]
  );
}
console.log(`✓ Inserted ${alerts.length} alerts`);

await client.end();
console.log("\n✅ Seed complete!");
