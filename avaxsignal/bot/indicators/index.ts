/**
 * indicators/index.ts — Technical indicator engine
 *
 * Wraps all 4 indicators (EMA, RSI, MACD, Bollinger Bands) into a single
 * IndicatorEngine class. Feed it a price, get all indicator values back.
 *
 * All indicators are streaming-friendly — they accept one price at a time
 * and maintain internal state.
 */

export { EMA } from "./ema";
export { RSI } from "./rsi";
export { MACD, type MACDResult } from "./macd";
export { BollingerBands, type BollingerBandsResult } from "./bollingerBands";

import { EMA } from "./ema";
import { RSI } from "./rsi";
import { MACD, MACDResult } from "./macd";
import { BollingerBands, BollingerBandsResult } from "./bollingerBands";

// ─── Types ───────────────────────────────────────────────────────────

export interface IndicatorSnapshot {
  ema12: number | null;
  ema26: number | null;
  rsi: number | null;
  macd: MACDResult | null;
  bollingerBands: BollingerBandsResult | null;
  /** True when all indicators have produced at least one value */
  isReady: boolean;
}

// ─── IndicatorEngine ─────────────────────────────────────────────────

export class IndicatorEngine {
  private ema12: EMA;
  private ema26: EMA;
  private rsi: RSI;
  private macd: MACD;
  private bb: BollingerBands;
  private tickCount: number = 0;

  constructor() {
    this.ema12 = new EMA(12);
    this.ema26 = new EMA(26);
    this.rsi = new RSI(14);
    this.macd = new MACD(12, 26, 9);
    this.bb = new BollingerBands(20, 2);
  }

  /**
   * Feed a new price value into all indicators.
   * Returns a snapshot of all indicator values.
   */
  update(price: number): IndicatorSnapshot {
    this.tickCount++;

    const ema12 = this.ema12.update(price);
    const ema26 = this.ema26.update(price);
    const rsi = this.rsi.update(price);
    const macd = this.macd.update(price);
    const bollingerBands = this.bb.update(price);

    const isReady =
      ema12 !== null &&
      ema26 !== null &&
      rsi !== null &&
      macd !== null &&
      bollingerBands !== null;

    return { ema12, ema26, rsi, macd, bollingerBands, isReady };
  }

  /**
   * Get current indicator values without updating.
   */
  getSnapshot(): IndicatorSnapshot {
    const ema12 = this.ema12.getValue();
    const ema26 = this.ema26.getValue();
    const rsi = this.rsi.getValue();
    const macd = this.macd.getValue();
    const bollingerBands = this.bb.getValue();

    return {
      ema12,
      ema26,
      rsi,
      macd,
      bollingerBands,
      isReady:
        ema12 !== null &&
        ema26 !== null &&
        rsi !== null &&
        macd !== null &&
        bollingerBands !== null,
    };
  }

  /**
   * Number of prices fed so far.
   */
  getTickCount(): number {
    return this.tickCount;
  }

  /**
   * Minimum ticks needed before all indicators are ready.
   * EMA-26 needs 26, MACD needs 26+9=35, BB needs 20, RSI needs 15.
   * So ~35 ticks minimum.
   */
  getWarmUpPeriod(): number {
    return 35;
  }

  /**
   * Reset all indicators.
   */
  reset(): void {
    this.ema12.reset();
    this.ema26.reset();
    this.rsi.reset();
    this.macd.reset();
    this.bb.reset();
    this.tickCount = 0;
  }
}
