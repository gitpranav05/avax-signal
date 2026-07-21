/**
 * signalEngine.ts — Rule-based buy/sell/hold signal generator
 *
 * Consumes IndicatorEngine output (EMA, RSI, MACD, Bollinger Bands)
 * and applies rule-based logic to produce trading signals.
 *
 * Signal rules:
 *
 * BUY (any of):
 *   - RSI < 30 (oversold) AND price <= lower Bollinger Band
 *   - MACD histogram crosses from negative to positive AND EMA12 > EMA26
 *
 * SELL (any of):
 *   - RSI > 70 (overbought) AND price >= upper Bollinger Band
 *   - MACD histogram crosses from positive to negative AND EMA12 < EMA26
 *
 * HOLD: default when neither buy nor sell triggers
 */

import { EventEmitter } from "events";
import { IndicatorEngine, IndicatorSnapshot } from "../indicators";

// ─── Types ───────────────────────────────────────────────────────────

export type SignalType = "BUY" | "SELL" | "HOLD";

export interface Signal {
  type: SignalType;
  price: number;
  indicators: IndicatorSnapshot;
  reasons: string[];
  timestamp: Date;
}

// ─── SignalEngine ────────────────────────────────────────────────────

export class SignalEngine extends EventEmitter {
  private indicatorEngine: IndicatorEngine;
  private prevHistogram: number | null = null;
  private signalCount: { BUY: number; SELL: number; HOLD: number } = {
    BUY: 0,
    SELL: 0,
    HOLD: 0,
  };

  constructor(indicatorEngine?: IndicatorEngine) {
    super();
    this.indicatorEngine = indicatorEngine || new IndicatorEngine();
  }

  /**
   * Feed a new price and get a signal back.
   * The indicator engine is updated internally.
   */
  processPrice(price: number): Signal {
    const snapshot = this.indicatorEngine.update(price);
    const signal = this.evaluate(price, snapshot);

    this.signalCount[signal.type]++;
    this.emit("signal", signal);

    return signal;
  }

  /**
   * Evaluate indicator snapshot against rules to produce a signal.
   */
  private evaluate(price: number, snapshot: IndicatorSnapshot): Signal {
    const reasons: string[] = [];
    let type: SignalType = "HOLD";

    // Need all indicators ready before generating buy/sell
    if (!snapshot.isReady) {
      return {
        type: "HOLD",
        price,
        indicators: snapshot,
        reasons: ["Warming up — not all indicators ready yet"],
        timestamp: new Date(),
      };
    }

    const { ema12, ema26, rsi, macd, bollingerBands } = snapshot;

    // ── BUY conditions ───────────────────────────────────────────
    const buyReasons: string[] = [];

    // RSI oversold + price at/below lower Bollinger Band
    if (rsi! < 30 && price <= bollingerBands!.lower) {
      buyReasons.push(
        `RSI oversold (${rsi!.toFixed(1)}) + price ($${price.toFixed(2)}) at/below lower BB ($${bollingerBands!.lower.toFixed(2)})`
      );
    }

    // MACD histogram crosses positive + EMA uptrend
    if (
      this.prevHistogram !== null &&
      this.prevHistogram <= 0 &&
      macd!.histogram > 0 &&
      ema12! > ema26!
    ) {
      buyReasons.push(
        `MACD histogram crossed positive (${macd!.histogram.toFixed(4)}) + EMA12 > EMA26 (uptrend)`
      );
    }

    // ── SELL conditions ──────────────────────────────────────────
    const sellReasons: string[] = [];

    // RSI overbought + price at/above upper Bollinger Band
    if (rsi! > 70 && price >= bollingerBands!.upper) {
      sellReasons.push(
        `RSI overbought (${rsi!.toFixed(1)}) + price ($${price.toFixed(2)}) at/above upper BB ($${bollingerBands!.upper.toFixed(2)})`
      );
    }

    // MACD histogram crosses negative + EMA downtrend
    if (
      this.prevHistogram !== null &&
      this.prevHistogram >= 0 &&
      macd!.histogram < 0 &&
      ema12! < ema26!
    ) {
      sellReasons.push(
        `MACD histogram crossed negative (${macd!.histogram.toFixed(4)}) + EMA12 < EMA26 (downtrend)`
      );
    }

    // ── Resolve signal ───────────────────────────────────────────
    // Buy takes priority if both fire (unlikely but possible)
    if (buyReasons.length > 0) {
      type = "BUY";
      reasons.push(...buyReasons);
    } else if (sellReasons.length > 0) {
      type = "SELL";
      reasons.push(...sellReasons);
    } else {
      reasons.push("No buy/sell conditions met");
    }

    // Track histogram for crossover detection
    this.prevHistogram = macd!.histogram;

    return {
      type,
      price,
      indicators: snapshot,
      reasons,
      timestamp: new Date(),
    };
  }

  /**
   * Get signal counts.
   */
  getStats(): { BUY: number; SELL: number; HOLD: number; total: number } {
    return {
      ...this.signalCount,
      total: this.signalCount.BUY + this.signalCount.SELL + this.signalCount.HOLD,
    };
  }

  /**
   * Get the underlying indicator engine.
   */
  getIndicatorEngine(): IndicatorEngine {
    return this.indicatorEngine;
  }

  /**
   * Reset signal engine and all indicators.
   */
  reset(): void {
    this.indicatorEngine.reset();
    this.prevHistogram = null;
    this.signalCount = { BUY: 0, SELL: 0, HOLD: 0 };
  }
}
