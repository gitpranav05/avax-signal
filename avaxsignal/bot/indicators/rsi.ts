/**
 * rsi.ts — Relative Strength Index
 *
 * Streaming-friendly: accepts one price at a time via update().
 * Returns null until enough data points (period + 1).
 *
 * RSI formula:
 *   RS = average gain / average loss (over `period` bars)
 *   RSI = 100 - (100 / (1 + RS))
 *
 * Uses Wilder's smoothing method (exponential) after the initial SMA seed.
 */

export class RSI {
  readonly period: number;
  private prevPrice: number | null = null;
  private gains: number[] = [];
  private losses: number[] = [];
  private avgGain: number | null = null;
  private avgLoss: number | null = null;
  private value: number | null = null;
  private count: number = 0;

  constructor(period: number = 14) {
    if (period < 1) throw new Error("RSI period must be >= 1");
    this.period = period;
  }

  /**
   * Feed a new price value.
   * Returns the current RSI (0-100) or null if not enough data yet.
   */
  update(price: number): number | null {
    this.count++;

    if (this.prevPrice === null) {
      this.prevPrice = price;
      return null;
    }

    const change = price - this.prevPrice;
    this.prevPrice = price;

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (this.avgGain === null) {
      // Accumulating phase — building initial SMA
      this.gains.push(gain);
      this.losses.push(loss);

      if (this.gains.length >= this.period) {
        // Seed with SMA
        this.avgGain =
          this.gains.reduce((a, b) => a + b, 0) / this.period;
        this.avgLoss =
          this.losses.reduce((a, b) => a + b, 0) / this.period;

        this.value = this.calculateRSI(this.avgGain, this.avgLoss);

        // Free the arrays — no longer needed
        this.gains = [];
        this.losses = [];
      }

      return this.value;
    }

    // Wilder's smoothing
    this.avgGain = (this.avgGain * (this.period - 1) + gain) / this.period;
    this.avgLoss = (this.avgLoss! * (this.period - 1) + loss) / this.period;

    this.value = this.calculateRSI(this.avgGain, this.avgLoss);
    return this.value;
  }

  private calculateRSI(avgGain: number, avgLoss: number): number {
    if (avgLoss === 0) return 100; // No losses — maximum strength
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Get current RSI value without updating.
   */
  getValue(): number | null {
    return this.value;
  }

  /**
   * Reset the indicator to its initial state.
   */
  reset(): void {
    this.prevPrice = null;
    this.gains = [];
    this.losses = [];
    this.avgGain = null;
    this.avgLoss = null;
    this.value = null;
    this.count = 0;
  }
}
