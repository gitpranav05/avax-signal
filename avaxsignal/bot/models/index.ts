/**
 * models/index.ts — Mongoose schemas and DB connection
 *
 * PriceTick: stores each price poll from the on-chain pool reader.
 * Signal and Trade schemas will be added in Phase 2-3.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ─── PriceTick Schema ────────────────────────────────────────────────

export interface IPriceTick {
  price: number;
  reserve0: string; // BigInt as string for MongoDB storage
  reserve1: string;
  token0: string;
  token1: string;
  poolAddress: string;
  network: "mainnet" | "fuji";
  timestamp: Date;
}

const priceTickSchema = new mongoose.Schema<IPriceTick>(
  {
    price: { type: Number, required: true, index: true },
    reserve0: { type: String, required: true },
    reserve1: { type: String, required: true },
    token0: { type: String, required: true },
    token1: { type: String, required: true },
    poolAddress: { type: String, required: true },
    network: { type: String, enum: ["mainnet", "fuji"], required: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const PriceTick = mongoose.model<IPriceTick>(
  "PriceTick",
  priceTickSchema
);

// ─── DB Connection ───────────────────────────────────────────────────

let isConnected = false;

/**
 * Connect to MongoDB. Safe to call multiple times — will only connect once.
 * Returns true if connected, false if connection failed (non-fatal for price reading).
 */
export async function connectDB(): Promise<boolean> {
  if (isConnected) return true;

  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/avaxsignal";

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log(`[AvaxSignal] ✓ MongoDB connected: ${uri}`);
    return true;
  } catch (err) {
    console.warn(
      "[AvaxSignal] ⚠ MongoDB connection failed — price ticks will NOT be persisted.",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log("[AvaxSignal] MongoDB disconnected.");
}
