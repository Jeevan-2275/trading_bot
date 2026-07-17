import { Router } from "express";
import { SaveCredentialsBody } from "@workspace/api-zod";
import { setCredentials } from "./orders";

const router = Router();

// GET /api/credentials — check status
router.get("/", (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY || "";
  const apiSecret = process.env.BINANCE_API_SECRET || "";

  const hasApiKey = apiKey.length > 0 && !apiKey.startsWith("your_");
  const hasApiSecret = apiSecret.length > 0 && !apiSecret.startsWith("your_");
  const configured = hasApiKey && hasApiSecret;

  return res.json({
    configured,
    hasApiKey,
    hasApiSecret,
    message: configured
      ? "Binance Futures Testnet credentials are configured."
      : "API credentials are not configured. Enter them in Settings.",
  });
});

// POST /api/credentials — save credentials for the current session
router.post("/", (req, res) => {
  const parsed = SaveCredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials input" });
  }

  const { apiKey, apiSecret } = parsed.data;

  // Store in process.env for this session (also updates the runtime state)
  process.env.BINANCE_API_KEY = apiKey;
  process.env.BINANCE_API_SECRET = apiSecret;
  setCredentials(apiKey, apiSecret);

  const hasApiKey = apiKey.length > 0 && !apiKey.startsWith("your_");
  const hasApiSecret = apiSecret.length > 0 && !apiSecret.startsWith("your_");
  const configured = hasApiKey && hasApiSecret;

  return res.json({
    configured,
    hasApiKey,
    hasApiSecret,
    message: configured
      ? "Credentials saved for this session."
      : "Credentials saved but appear invalid (check placeholder values).",
  });
});

export { router as credentialsRouter };
