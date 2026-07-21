/**
 * macd.ts — Moving Average Convergence Divergence
 *
 * Streaming-friendly: accepts one price at a time via update().
 *
 * MACD = EMA(fastPeriod) - EMA(slowPeriod)
 * Signal = EMA(signalPeriod) of MACD
 * Histogram = MACD - Signal
 *
 * Default periods: fast=12, slow=26, signal=9
 */

import { EMA } from "./ema";

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export class MACD {
  private fastEMA: EMA;
  private slowEMA: EMA;
  private signalEMA: EMA;
  private value: MACDResult | null = null;

  constructor(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ) {
    this.fastEMA = new EMA(fastPeriod);
    this.slowEMA = new EMA(slowPeriod);
    this.signalEMA = new EMA(signalPeriod);
  }

  /**
   * Feed a new price value.
   * Returns MACD result or null if not enough data yet.
   */
  update(price: number): MACDResult | null {
    const fast = this.fastEMA.update(price);
    const slow = this.slowEMA.update(price);

    // Need both EMAs to have values
    if (fast === null || slow === null) return null;

    const macdLine = fast - slow;
    const signalLine = this.signalEMA.update(macdLine);

    // Need signal EMA to have a value too
    if (signalLine === null) return null;

    this.value = {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine,
    };

    return this.value;
  }

  /**
   * Get current MACD values without updating.
   */
  getValue(): MACDResult | null {
    return this.value;
  }

  /**
   * Get the raw MACD line (fast - slow) even before signal line is ready.
   * Useful for debugging.
   */
  getRawMACD(): number | null {
    const fast = this.fastEMA.getValue();
    const slow = this.slowEMA.getValue();
    if (fast === null || slow === null) return null;
    return fast - slow;
  }

  /**
   * Reset the indicator to its initial state.
   */
  reset(): void {
    this.fastEMA.reset();
    this.slowEMA.reset();
    this.signalEMA.reset();
    this.value = null;
  }
}
