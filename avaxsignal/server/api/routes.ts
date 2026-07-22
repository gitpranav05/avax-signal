/**
 * routes.ts — Express API routes
 */

import { Router } from "express";
import { getBotStatus, getRecentData } from "../../bot";

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

export default router;
