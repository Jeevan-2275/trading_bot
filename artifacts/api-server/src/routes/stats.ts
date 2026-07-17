import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/stats
router.get("/", async (_req, res) => {
  const rows = await db.select().from(ordersTable);

  const total = rows.length;
  const successful = rows.filter(
    (r) => r.status === "FILLED" || r.status === "NEW" || r.status === "TEST_OK"
  ).length;
  const failed = rows.filter((r) => r.status === "FAILED").length;
  const testOrders = rows.filter((r) => r.testMode).length;
  const realOrders = rows.filter((r) => !r.testMode).length;

  const byType: Record<string, number> = {};
  const bySide: Record<string, number> = {};

  for (const r of rows) {
    byType[r.orderType] = (byType[r.orderType] || 0) + 1;
    bySide[r.side] = (bySide[r.side] || 0) + 1;
  }

  return res.json({ total, successful, failed, testOrders, realOrders, byType, bySide });
});

export { router as statsRouter };
