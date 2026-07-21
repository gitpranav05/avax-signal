/**
 * ema.ts — Exponential Moving Average
 *
 * Streaming-friendly: accepts one price at a time via update().
 * Returns null until enough data points have been collected.
 *
 * EMA formula:
 *   multiplier = 2 / (period + 1)
 *   EMA_today = (price - EMA_yesterday) * multiplier + EMA_yesterday
 *
 * First EMA value is seeded with a simple moving average (SMA).
 */

export class EMA {
  readonly period: number;
  private multiplier: number;
  private value: number | null = null;
  private count: number = 0;
  private sum: number = 0;

  constructor(period: number) {
    if (period < 1) throw new Error("EMA period must be >= 1");
    this.period = period;
    this.multiplier = 2 / (period + 1);
  }

  /**
   * Feed a new price value.
   * Returns the current EMA or null if not enough data yet.
   */
  update(price: number): number | null {
    this.count++;

    if (this.value === null) {
      // Accumulate for initial SMA seed
      this.sum += price;
      if (this.count >= this.period) {
        // Seed EMA with SMA
        this.value = this.sum / this.period;
      }
      return this.value;
    }

    // Standard EMA calculation
    this.value = (price - this.value) * this.multiplier + this.value;
    return this.value;
  }

  /**
   * Get current EMA value without updating.
   */
  getValue(): number | null {
    return this.value;
  }

  /**
   * Reset the indicator to its initial state.
   */
  reset(): void {
    this.value = null;
    this.count = 0;
    this.sum = 0;
  }
}
