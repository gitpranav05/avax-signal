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

// ─── Signal Schema ───────────────────────────────────────────────────

export interface ISignal {
  type: "BUY" | "SELL" | "HOLD";
  price: number;
  indicators: {
    ema12: number | null;
    ema26: number | null;
    rsi: number | null;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    } | null;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
    } | null;
  };
  reasons: string[];
  timestamp: Date;
}

const signalSchema = new mongoose.Schema<ISignal>(
  {
    type: {
      type: String,
      enum: ["BUY", "SELL", "HOLD"],
      required: true,
      index: true,
    },
    price: { type: Number, required: true },
    indicators: {
      ema12: { type: Number, default: null },
      ema26: { type: Number, default: null },
      rsi: { type: Number, default: null },
      macd: {
        type: {
          macd: Number,
          signal: Number,
          histogram: Number,
        },
        default: null,
      },
      bollingerBands: {
        type: {
          upper: Number,
          middle: Number,
          lower: Number,
          bandwidth: Number,
        },
        default: null,
      },
    },
    reasons: [{ type: String }],
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const SignalModel = mongoose.model<ISignal>("Signal", signalSchema);

// ─── Trade Schema ────────────────────────────────────────────────────

export interface ITrade {
  type: "BUY" | "SELL";
  price: number;
  amount: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  balance: number;
  timestamp: Date;
}

const tradeSchema = new mongoose.Schema<ITrade>(
  {
    type: { type: String, enum: ["BUY", "SELL"], required: true, index: true },
    price: { type: Number, required: true },
    amount: { type: Number, required: true },
    value: { type: Number, required: true },
    pnl: { type: Number, default: 0 },
    pnlPercent: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const TradeModel = mongoose.model<ITrade>("Trade", tradeSchema);

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
