/**
 * server/index.ts — Express + Socket.IO server entry point
 */

import express from "express";
import { createServer } from "http";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./api/routes";
import { initSocket } from "./socket";
import { startBot } from "../bot";

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const app = express();
const httpServer = createServer(app);

app.use(express.json());

// CORS for Vite dev server
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use("/api", apiRoutes);

// Static files (production build)
const clientBuildPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientBuildPath));

app.get("*", (_req, res) => {
  const indexPath = path.join(clientBuildPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({ message: "AvaxSignal API running. Dashboard on Vite dev server." });
    }
  });
});

async function start(): Promise<void> {
  initSocket(httpServer);

  try {
    await startBot();
  } catch (err) {
    console.error("[AvaxSignal] ✗ Bot failed to start:", err instanceof Error ? err.message : err);
    console.log("[AvaxSignal] Server will run without live data.");
  }

  httpServer.listen(PORT, () => {
    console.log(`[AvaxSignal] ✓ Server running on http://localhost:${PORT}`);
    console.log(`[AvaxSignal]   API: http://localhost:${PORT}/api/status`);
    console.log(`[AvaxSignal]   Dashboard: http://localhost:5173 (dev)`);
  });
}

start().catch((err) => {
  console.error("[AvaxSignal] ✗ Server failed:", err);
  process.exit(1);
});
