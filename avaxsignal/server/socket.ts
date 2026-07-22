/**
 * socket.ts — Socket.IO event emitters
 *
 * Subscribes to bot event bus and relays events to connected dashboard clients.
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { botEvents, getRecentData } from "../bot";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:3001"],
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[AvaxSignal] Dashboard client connected: ${socket.id}`);

    // Send recent data to hydrate dashboard (all JSON-safe)
    const recentData = getRecentData();
    socket.emit("initialData", recentData);

    socket.on("disconnect", () => {
      console.log(`[AvaxSignal] Dashboard client disconnected: ${socket.id}`);
    });
  });

  // Relay bot events to all clients
  botEvents.on("priceTick", (tick) => {
    io!.emit("priceTick", tick);
  });

  botEvents.on("signal", (signal) => {
    if (signal.type !== "HOLD") {
      io!.emit("signal", {
        type: signal.type,
        price: signal.price,
        indicators: signal.indicators,
        reasons: signal.reasons,
        timestamp: signal.timestamp,
      });
    }
  });

  botEvents.on("trade", (trade) => {
    io!.emit("trade", trade);
  });

  botEvents.on("portfolioUpdate", (portfolio) => {
    io!.emit("portfolioUpdate", portfolio);
  });

  console.log("[AvaxSignal] ✓ Socket.IO initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
