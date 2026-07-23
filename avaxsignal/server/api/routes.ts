/**
 * routes.ts — Express API routes
 */

import { Router, Request, Response } from "express";
import { getBotStatus, getRecentData } from "../../bot";
import { executor } from "../../bot/chain/executor";

const router = Router();

router.get("/status", (_req, res) => {
  res.json(getBotStatus());
});

router.get("/signals", (_req, res) => {
  res.json(getRecentData().signals);
});

router.get("/trades", (_req, res) => {
  res.json(getRecentData().trades);
});

router.get("/portfolio", (_req, res) => {
  res.json(getRecentData().portfolio);
});

router.get("/prices", (_req, res) => {
  res.json(getRecentData().prices);
});

// ─── Phase 4: Wallet + Execution ─────────────────────────────────────

router.get("/wallet", async (_req: Request, res: Response) => {
  try {
    const info = await executor.getWalletInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to get wallet info",
    });
  }
});

router.post("/swap", async (req: Request, res: Response) => {
  try {
    const type: "BUY" | "SELL" = req.body?.type === "SELL" ? "SELL" : "BUY";
    const amountAVAX: string = req.body?.amountAVAX || "0.01";

    // Validate amount (max 0.1 AVAX per swap for safety)
    const amount = parseFloat(amountAVAX);
    if (isNaN(amount) || amount <= 0 || amount > 0.1) {
      res.status(400).json({ error: "amountAVAX must be between 0 and 0.1" });
      return;
    }

    const result = await executor.executeSwap(type, amountAVAX);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Swap failed",
      success: false,
    });
  }
});

export default router;
