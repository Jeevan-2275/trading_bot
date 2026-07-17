import { Router } from "express";
import fs from "fs";
import path from "path";
import { GetLogsQueryParams } from "@workspace/api-zod";

const router = Router();

const BOT_DIR = path.resolve(process.cwd(), "trading_bot");
const LOG_FILE = path.resolve(BOT_DIR, "trading_bot.log");

const LOG_LEVEL_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+) - (DEBUG|INFO|WARNING|ERROR|CRITICAL) - \[([^\]]+)\] - (.+)$/;

function parseLogLine(line: string) {
  const m = line.match(LOG_LEVEL_RE);
  if (!m) return null;
  return {
    timestamp: m[1].replace(",", "."),
    level: m[2],
    filename: m[3],
    message: m[4],
  };
}

// GET /api/logs
router.get("/", (req, res) => {
  const parsed = GetLogsQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 200;
  const levelFilter = parsed.success && parsed.data.level ? parsed.data.level.toUpperCase() : null;

  let lines: Array<{ timestamp: string; level: string; filename: string | null; message: string }> = [];

  if (!fs.existsSync(LOG_FILE)) {
    return res.json([]);
  }

  try {
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    const rawLines = content.split("\n").filter(Boolean);

    for (const line of rawLines) {
      const parsed = parseLogLine(line);
      if (parsed) {
        if (!levelFilter || parsed.level === levelFilter) {
          lines.push(parsed);
        }
      }
    }

    // Return the most recent `limit` entries
    lines = lines.slice(-limit);
  } catch {
    return res.json([]);
  }

  return res.json(lines);
});

export { router as logsRouter };
