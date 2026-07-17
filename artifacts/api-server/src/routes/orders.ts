import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
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

// __dirname = …/artifacts/api-server/dist  →  ../../.. = workspace root
const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");
const BOT_DIR = path.join(WORKSPACE_ROOT, "trading_bot");
const LOG_FILE = path.join(BOT_DIR, "trading_bot.log");

// Augment PATH so python3 / pip packages are resolvable inside spawn()
const PYTHON_EXTRA_PATHS = [
  path.join(WORKSPACE_ROOT, ".pythonlibs", "bin"),
  "/nix/var/nix/profiles/default/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
].join(":");
const SPAWN_PATH = PYTHON_EXTRA_PATHS + (process.env.PATH ? `:${process.env.PATH}` : "");

// In-memory credential store (session only)
let runtimeApiKey = process.env.BINANCE_API_KEY || "";
let runtimeApiSecret = process.env.BINANCE_API_SECRET || "";

export function setCredentials(key: string, secret: string) {
  runtimeApiKey = key;
  runtimeApiSecret = secret;
}

/**
 * Run the Python bot CLI and return parsed JSON output
 */
function runBotCLI(args: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PATH: SPAWN_PATH,
      BINANCE_API_KEY: runtimeApiKey,
      BINANCE_API_SECRET: runtimeApiSecret,
      BOT_LOG_FILE: LOG_FILE,
      PYTHONPATH: BOT_DIR,
    };

    const proc = spawn("python3", [path.join(BOT_DIR, "cli.py"), "--json", ...args], {
      env,
      cwd: BOT_DIR,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", () => {
      try {
        // The bot may mix Rich console output with JSON on stdout.
        // Find the LAST line that looks like a JSON object — that's the --json output.
        const lines = stdout.split("\n").map((l) => l.trim());
        const jsonLine = [...lines].reverse().find((l) => l.startsWith("{") && l.endsWith("}"));
        if (jsonLine) {
          resolve(JSON.parse(jsonLine));
        } else {
          logger.warn({ stdout, stderr }, "Bot produced no JSON output");
          resolve({ success: false, message: stderr || stdout || "No output from bot" });
        }
      } catch (e) {
        logger.warn({ stdout, stderr, err: e }, "Bot JSON parse error");
        resolve({ success: false, message: `Bot output parse error: ${e}` });
      }
    });

    proc.on("error", (err: Error) => {
      reject(err);
    });
  });
}

function serializeOrder(r: typeof ordersTable.$inferSelect) {
  return {
    ...r,
    quantity: Number(r.quantity),
    price: r.price != null ? Number(r.price) : null,
    stopPrice: r.stopPrice != null ? Number(r.stopPrice) : null,
    createdAt: r.createdAt.toISOString(),
  };
}

// POST /api/orders — place a new order
router.post("/", async (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { symbol, side, orderType, quantity, price, stopPrice, testMode } = parsed.data;

  const args: string[] = [
    "--symbol", symbol,
    "--side", side,
    "--type", orderType,
    "--quantity", String(quantity),
  ];
  if (price != null) args.push("--price", String(price));
  if (stopPrice != null) args.push("--stop-price", String(stopPrice));
  if (testMode) args.push("--test");

  req.log.info({ symbol, side, orderType, quantity, testMode }, "Placing order via bot CLI");

  let botResult: Record<string, unknown>;
  try {
    botResult = await runBotCLI(args);
  } catch (err) {
    req.log.error({ err }, "Bot CLI error");
    return res.status(500).json({ error: "Failed to run trading bot" });
  }

  const success = botResult.success === true;
  const isTestMode = testMode ?? false;

  let dbStatus = "FAILED";
  if (success && isTestMode) dbStatus = "TEST_OK";
  else if (success) dbStatus = String(botResult.status ?? "FILLED");

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
      executedQty: botResult.executed_qty != null ? String(botResult.executed_qty) : null,
      avgPrice: botResult.avg_price != null ? String(botResult.avg_price) : null,
      errorMessage: !success ? String(botResult.message ?? "") : null,
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

export { router as ordersRouter, LOG_FILE };
