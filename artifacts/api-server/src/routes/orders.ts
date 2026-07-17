import { Router } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  PlaceOrderBody,
  ListOrdersQueryParams,
  GetOrderParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

const BINANCE_BASE = "https://testnet.binancefuture.com";

// In-memory credential store (session only)
let runtimeApiKey = process.env.BINANCE_API_KEY || "";
let runtimeApiSecret = process.env.BINANCE_API_SECRET || "";

export function setCredentials(key: string, secret: string) {
  runtimeApiKey = key;
  runtimeApiSecret = secret;
}

// ---------------------------------------------------------------------------
// Binance Futures Testnet client (pure Node.js — no Python subprocess needed)
// ---------------------------------------------------------------------------

/** Fetch Binance server time and return local→server offset in ms */
async function getBinanceTimeOffset(): Promise<number> {
  try {
    const localBefore = Date.now();
    const res = await fetch(`${BINANCE_BASE}/fapi/v1/time`);
    const localAfter = Date.now();
    if (!res.ok) return 0;
    const data = (await res.json()) as { serverTime: number };
    const transit = Math.floor((localAfter - localBefore) / 2);
    return data.serverTime - (localBefore + transit);
  } catch {
    return 0;
  }
}

function hmacSha256(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

interface BinanceOrderResult {
  success: boolean;
  test_mode: boolean;
  order_id?: number | null;
  status?: string;
  executed_qty?: string;
  avg_price?: string;
  message: string;
  data?: Record<string, unknown>;
}

async function placeBinanceOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: string,
  orderType: string,
  quantity: number,
  price: number | null | undefined,
  stopPrice: number | null | undefined,
  testMode: boolean
): Promise<BinanceOrderResult> {
  if (!apiKey || !apiSecret) {
    return {
      success: false,
      test_mode: testMode,
      message:
        "API credentials not found. Set BINANCE_API_KEY and BINANCE_API_SECRET in Render → Environment.",
    };
  }

  // Sync timestamp
  const offset = await getBinanceTimeOffset();
  const timestamp = Date.now() + offset;

  // Build params
  const params: Record<string, string> = {
    symbol,
    side,
    type: orderType,
    quantity: String(quantity),
    timestamp: String(timestamp),
  };
  if (orderType === "LIMIT" && price != null) {
    params.price = String(price);
    params.timeInForce = "GTC";
  }
  if (orderType === "STOP_MARKET" && stopPrice != null) {
    params.stopPrice = String(stopPrice);
  }

  // Sign
  const queryString = new URLSearchParams(params).toString();
  const signature = hmacSha256(apiSecret, queryString);
  params.signature = signature;

  const endpoint = testMode ? "/fapi/v1/order/test" : "/fapi/v1/order";
  const url = `${BINANCE_BASE}${endpoint}`;

  logger.info({ symbol, side, orderType, quantity, testMode, endpoint }, "Placing order via Binance API");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch (err) {
    return {
      success: false,
      test_mode: testMode,
      message: `Network error contacting Binance: ${String(err)}`,
    };
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = { raw: await res.text().catch(() => "") };
  }

  if (!res.ok) {
    const code = data.code ?? res.status;
    const msg = (data.msg as string) ?? "Unknown Binance API error";
    return {
      success: false,
      test_mode: testMode,
      message: `Binance API Error (Code: ${code}): ${msg}`,
      data,
    };
  }

  // Test endpoint returns {} on success
  if (testMode) {
    return {
      success: true,
      test_mode: true,
      message: "Dry-run order validation succeeded. Parameters and credentials are valid.",
      data,
    };
  }

  return {
    success: true,
    test_mode: false,
    order_id: (data.orderId as number) ?? null,
    status: (data.status as string) ?? "FILLED",
    executed_qty: (data.executedQty as string) ?? "0",
    avg_price: (data.avgPrice as string) ?? "0",
    message: "Order executed successfully on Testnet.",
    data,
  };
}

// ---------------------------------------------------------------------------
// Serialise DB row
// ---------------------------------------------------------------------------

function serializeOrder(r: typeof ordersTable.$inferSelect) {
  return {
    ...r,
    quantity: Number(r.quantity),
    price: r.price != null ? Number(r.price) : null,
    stopPrice: r.stopPrice != null ? Number(r.stopPrice) : null,
    createdAt: r.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /api/orders — place a new order
router.post("/", async (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { symbol, side, orderType, quantity, price, stopPrice, testMode } = parsed.data;

  req.log.info({ symbol, side, orderType, quantity, testMode }, "Placing order");

  const botResult = await placeBinanceOrder(
    runtimeApiKey,
    runtimeApiSecret,
    symbol,
    side,
    orderType,
    quantity,
    price,
    stopPrice,
    testMode ?? true
  );

  const success = botResult.success;
  const isTestMode = testMode ?? false;

  let dbStatus = "FAILED";
  if (success && isTestMode) dbStatus = "TEST_OK";
  else if (success) dbStatus = botResult.status ?? "FILLED";

  const [savedOrder] = await db
    .insert(ordersTable)
    .values({
      symbol,
      side,
      orderType,
      quantity: String(quantity),
      price: price != null ? String(price) : null,
      stopPrice: stopPrice != null ? String(stopPrice) : null,
      testMode: isTestMode,
      status: dbStatus,
      orderId: botResult.order_id != null ? String(botResult.order_id) : null,
      executedQty: botResult.executed_qty ?? null,
      avgPrice: botResult.avg_price ?? null,
      errorMessage: !success ? botResult.message : null,
    })
    .returning();

  return res.json({
    success,
    testMode: isTestMode,
    orderId: botResult.order_id ?? null,
    status: dbStatus,
    executedQty: botResult.executed_qty ?? null,
    avgPrice: botResult.avg_price ?? null,
    message: botResult.message ?? null,
    order: savedOrder ? serializeOrder(savedOrder) : null,
  });
});

// GET /api/orders — list orders
router.get("/", async (req, res) => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 50;

  const rows = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  return res.json(rows.map(serializeOrder));
});

// GET /api/orders/:id — get single order
router.get("/:id", async (req, res) => {
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, parsed.data.id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Order not found" });

  return res.json(serializeOrder(row));
});

// Keep LOG_FILE export so other modules that import it don't break
import path from "path";
const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");
export const LOG_FILE = path.join(WORKSPACE_ROOT, "trading_bot", "trading_bot.log");

export { router as ordersRouter };
