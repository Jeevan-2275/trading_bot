import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const journalTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  title: text("title").notNull(),
  notes: text("notes"),
  tags: text("tags"), // comma-separated
  sentiment: text("sentiment"), // bullish | bearish | neutral
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJournalSchema = createInsertSchema(journalTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJournal = z.infer<typeof insertJournalSchema>;
export type JournalEntry = typeof journalTable.$inferSelect;
