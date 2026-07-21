/**
 * bollingerBands.ts — Bollinger Bands
 *
 * Streaming-friendly: accepts one price at a time via update().
 *
 * Middle Band = SMA(period)
 * Upper Band = SMA + (stdDev * multiplier)
 * Lower Band = SMA - (stdDev * multiplier)
 *
 * Default: period=20, multiplier=2
 */

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number; // (upper - lower) / middle — measures volatility
}

export class BollingerBands {
  readonly period: number;
  readonly multiplier: number;
  private prices: number[] = [];
  private value: BollingerBandsResult | null = null;

  constructor(period: number = 20, multiplier: number = 2) {
    if (period < 1) throw new Error("BollingerBands period must be >= 1");
    this.period = period;
    this.multiplier = multiplier;
  }

  /**
   * Feed a new price value.
   * Returns Bollinger Bands result or null if not enough data.
   */
  update(price: number): BollingerBandsResult | null {
    this.prices.push(price);

    // Keep only the last `period` prices
    if (this.prices.length > this.period) {
      this.prices.shift();
    }

    // Need a full window to calculate
    if (this.prices.length < this.period) return null;

    const sma = this.prices.reduce((a, b) => a + b, 0) / this.period;
    const variance =
      this.prices.reduce((sum, p) => sum + (p - sma) ** 2, 0) / this.period;
    const stdDev = Math.sqrt(variance);

    const upper = sma + stdDev * this.multiplier;
    const lower = sma - stdDev * this.multiplier;

    this.value = {
      upper,
      middle: sma,
      lower,
      bandwidth: sma !== 0 ? (upper - lower) / sma : 0,
    };

    return this.value;
  }

  /**
   * Get current Bollinger Bands values without updating.
   */
  getValue(): BollingerBandsResult | null {
    return this.value;
  }

  /**
   * Reset the indicator to its initial state.
   */
  reset(): void {
    this.prices = [];
    this.value = null;
  }
}
