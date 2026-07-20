import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function parseAlertInput(body: unknown): { symbol: string; targetPrice: number; direction: "ABOVE" | "BELOW"; message?: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.symbol !== "string" || !b.symbol) return null;
  if (typeof b.targetPrice !== "number" || b.targetPrice <= 0) return null;
  if (b.direction !== "ABOVE" && b.direction !== "BELOW") return null;
  return {
    symbol: b.symbol,
    targetPrice: b.targetPrice,
    direction: b.direction,
    message: typeof b.message === "string" ? b.message : undefined,
  };
}

function serializeAlert(a: typeof alertsTable.$inferSelect) {
  return {
    ...a,
    targetPrice: parseFloat(String(a.targetPrice)),
    createdAt: a.createdAt.toISOString(),
  };
}

// GET /api/alerts
router.get("/", async (_req, res) => {
  const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));
  return res.json(alerts.map(serializeAlert));
});

// POST /api/alerts
router.post("/", async (req, res) => {
  const parsed = parseAlertInput(req.body);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid alert input" });
  }
  const { symbol, targetPrice, direction, message } = parsed;

  const [alert] = await db.insert(alertsTable).values({
    symbol: symbol.toUpperCase(),
    targetPrice: String(targetPrice),
    direction,
    message: message ?? null,
    triggered: false,
  }).returning();

  return res.json(serializeAlert(alert));
});

// DELETE /api/alerts/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(alertsTable).where(eq(alertsTable.id, id));
  return res.json({ success: true });
});

export { router as alertsRouter };
