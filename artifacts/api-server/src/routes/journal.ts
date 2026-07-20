import { Router } from "express";
import { db } from "@workspace/db";
import { journalTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

type JournalInput = { orderId?: number | null; title: string; notes?: string; tags?: string; sentiment?: string };

function parseJournalInput(body: unknown): JournalInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.title !== "string" || !b.title) return null;
  const sentiment = typeof b.sentiment === "string" ? b.sentiment : undefined;
  if (sentiment && !["bullish", "bearish", "neutral"].includes(sentiment)) return null;
  return {
    orderId: typeof b.orderId === "number" ? b.orderId : null,
    title: b.title,
    notes: typeof b.notes === "string" ? b.notes : undefined,
    tags: typeof b.tags === "string" ? b.tags : undefined,
    sentiment,
  };
}

function serializeEntry(e: typeof journalTable.$inferSelect) {
  return {
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

// GET /api/journal
router.get("/", async (_req, res) => {
  const entries = await db.select().from(journalTable).orderBy(desc(journalTable.createdAt));
  return res.json(entries.map(serializeEntry));
});

// POST /api/journal
router.post("/", async (req, res) => {
  const parsed = parseJournalInput(req.body);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid journal input" });
  }
  const { orderId, title, notes, tags, sentiment } = parsed;
  const now = new Date();
  const [entry] = await db.insert(journalTable).values({
    orderId: orderId ?? null,
    title,
    notes: notes ?? null,
    tags: tags ?? null,
    sentiment: sentiment ?? null,
    updatedAt: now,
  }).returning();

  return res.json(serializeEntry(entry));
});

// PUT /api/journal/:id
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = parseJournalInput(req.body);
  if (!parsed) return res.status(400).json({ error: "Invalid journal input" });

  const { orderId, title, notes, tags, sentiment } = parsed;
  const now = new Date();

  const [updated] = await db.update(journalTable)
    .set({ orderId: orderId ?? null, title, notes: notes ?? null, tags: tags ?? null, sentiment: sentiment ?? null, updatedAt: now })
    .where(eq(journalTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Entry not found" });
  return res.json(serializeEntry(updated));
});

// DELETE /api/journal/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(journalTable).where(eq(journalTable.id, id));
  return res.json({ success: true });
});

export { router as journalRouter };
