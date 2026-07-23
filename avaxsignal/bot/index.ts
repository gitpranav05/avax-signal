/**
 * index.ts — Main bot process
 *
 * Wires everything together:
 *   PoolReader → SignalEngine → PaperBroker
 *   Emits all events for the server to relay via Socket.IO
 */

import { EventEmitter } from "events";
import { PoolReader, PriceTickEvent } from "./chain/poolReader";
import { SignalEngine, Signal } from "./signals/signalEngine";
import { PaperBroker, Trade, PortfolioState } from "./broker/paperBroker";

// ─── Serialized types (no BigInt — safe for JSON/Socket.IO) ──────────

export interface SerializedPriceTick {
  price: number;
  timestamp: string;
}

// ─── Bot Event Bus ───────────────────────────────────────────────────

export const botEvents = new EventEmitter();

// ─── Bot State ───────────────────────────────────────────────────────

let poolReader: PoolReader | null = null;
let signalEngine: SignalEngine | null = null;
let paperBroker: PaperBroker | null = null;
let isRunning = false;

const recentPrices: SerializedPriceTick[] = [];
const recentSignals: Signal[] = [];
const MAX_RECENT = 200;

/**
 * Start the bot.
 */
export async function startBot(): Promise<void> {
  if (isRunning) {
    console.warn("[AvaxSignal] Bot is already running.");
    return;
  }

  console.log("[AvaxSignal] Starting bot...");

  poolReader = new PoolReader();
  signalEngine = new SignalEngine();
  paperBroker = new PaperBroker();

  let lastSignalPrice = 0;

  // Wire: PoolReader → SignalEngine → PaperBroker
  poolReader.on("priceTick", (tick: PriceTickEvent) => {
    const serialized: SerializedPriceTick = {
      price: tick.price,
      timestamp: tick.timestamp.toISOString(),
    };

    recentPrices.push(serialized);
    if (recentPrices.length > MAX_RECENT) recentPrices.shift();

    // Always relay price to dashboard (chart updates in real-time)
    botEvents.emit("priceTick", serialized);

    // Always feed indicators (every tick) — needed for fast warmup (~70s)
    const signal = signalEngine!.processPrice(tick.price);

    // Always emit indicator snapshot (dashboard panel updates live)
    botEvents.emit("signal", signal);

    // Only process BUY/SELL trades when price actually changes
    // Prevents RSI=100 SELL spam from duplicate prices
    if (tick.price === lastSignalPrice) return;
    lastSignalPrice = tick.price;

    // Only store meaningful signals (on price changes)
    if (signal.type !== "HOLD") {
      recentSignals.push(signal);
      if (recentSignals.length > MAX_RECENT) recentSignals.shift();
    }

    // Feed into paper broker (only on price changes)
    const trade = paperBroker!.processSignal(signal);
    if (trade) {
      botEvents.emit("trade", trade);
    }

    paperBroker!.updatePrice(tick.price);
  });

  paperBroker.on("portfolioUpdate", (portfolio: PortfolioState) => {
    botEvents.emit("portfolioUpdate", portfolio);
  });

  // Start price feed (skip MongoDB)
  await poolReader.start(false);
  isRunning = true;
  console.log("[AvaxSignal] ✓ Bot running — price feed → signals → paper trading");
}

/**
 * Stop the bot gracefully.
 */
export function stopBot(): void {
  if (poolReader) {
    poolReader.stop();
    poolReader.removeAllListeners();
  }
  isRunning = false;
  console.log("[AvaxSignal] Bot stopped.");
}

/**
 * Get current bot status.
 */
export function getBotStatus() {
  return {
    isRunning,
    poolInfo: poolReader?.getInfo() || null,
    signalStats: signalEngine?.getStats() || null,
    portfolio: paperBroker?.getPortfolio() || null,
  };
}

/**
 * Get recent data for initial client load (all JSON-safe, no BigInts).
 */
export function getRecentData() {
  return {
    prices: [...recentPrices],
    signals: recentSignals.filter((s) => s.type !== "HOLD").slice(-50),
    trades: paperBroker?.getRecentTrades(50) || [],
    portfolio: paperBroker?.getPortfolio() || null,
  };
}
