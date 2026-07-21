/**
 * testSignalEngine.ts — Phase 2 verification script
 *
 * Feeds simulated price data (oscillating pattern that triggers both
 * buy and sell signals) into the indicator + signal engine.
 *
 * Run: npm run test:signals
 *
 * "Done when": signals are generated from price data and logged with
 * the indicator values that triggered them.
 */

import { SignalEngine } from "./signalEngine";
import { Signal } from "./signalEngine";

const SEPARATOR = "─".repeat(60);

/**
 * Generate a simulated price series that oscillates between a range,
 * designed to trigger buy signals (dips) and sell signals (spikes).
 *
 * Pattern: base price with sine wave oscillation + some noise,
 * plus a sharp dip and a sharp spike to trigger RSI extremes.
 */
function generatePrices(count: number, basePrice: number): number[] {
  const prices: number[] = [];

  for (let i = 0; i < count; i++) {
    let price: number;

    if (i < 40) {
      // Initial stable period — warm up indicators
      price = basePrice + Math.sin(i * 0.15) * 0.3;
    } else if (i >= 40 && i < 55) {
      // Sharp downtrend — should trigger BUY (RSI drops, price hits lower BB)
      const dropProgress = (i - 40) / 15;
      price = basePrice - dropProgress * 3.5;
    } else if (i >= 55 && i < 70) {
      // Recovery — price bounces back
      const recoveryProgress = (i - 55) / 15;
      price = basePrice - 3.5 + recoveryProgress * 4.5;
    } else if (i >= 70 && i < 85) {
      // Sharp uptrend — should trigger SELL (RSI spikes, price hits upper BB)
      const riseProgress = (i - 70) / 15;
      price = basePrice + 1 + riseProgress * 3.5;
    } else {
      // Cool down — return toward base
      const coolProgress = (i - 85) / 15;
      price = basePrice + 4.5 - coolProgress * 3;
    }

    // Add small random noise
    price += (Math.random() - 0.5) * 0.1;
    prices.push(Number(price.toFixed(4)));
  }

  return prices;
}

async function testSignalEngine(): Promise<void> {
  console.log(SEPARATOR);
  console.log("[AvaxSignal] Phase 2 — Signal Engine Test");
  console.log(SEPARATOR);

  const engine = new SignalEngine();
  const prices = generatePrices(100, 25.0);
  const signals: Signal[] = [];

  console.log(`\n[AvaxSignal] Feeding ${prices.length} simulated price ticks...`);
  console.log(
    `[AvaxSignal] Warm-up period: ~${engine.getIndicatorEngine().getWarmUpPeriod()} ticks\n`
  );

  for (let i = 0; i < prices.length; i++) {
    const signal = engine.processPrice(prices[i]);

    // Log indicator values periodically
    if (signal.indicators.isReady && i % 5 === 0) {
      const ind = signal.indicators;
      console.log(
        `  Tick #${i + 1} — $${prices[i].toFixed(2)} | ` +
          `EMA12: ${ind.ema12!.toFixed(2)} | EMA26: ${ind.ema26!.toFixed(2)} | ` +
          `RSI: ${ind.rsi!.toFixed(1)} | ` +
          `MACD: ${ind.macd!.histogram.toFixed(4)} | ` +
          `BB: [${ind.bollingerBands!.lower.toFixed(2)}, ${ind.bollingerBands!.middle.toFixed(2)}, ${ind.bollingerBands!.upper.toFixed(2)}]`
      );
    }

    // Log buy/sell signals prominently
    if (signal.type === "BUY") {
      console.log(
        `\n  🟢 BUY signal at tick #${i + 1} — $${prices[i].toFixed(2)}`
      );
      signal.reasons.forEach((r) => console.log(`     → ${r}`));
      console.log("");
      signals.push(signal);
    } else if (signal.type === "SELL") {
      console.log(
        `\n  🔴 SELL signal at tick #${i + 1} — $${prices[i].toFixed(2)}`
      );
      signal.reasons.forEach((r) => console.log(`     → ${r}`));
      console.log("");
      signals.push(signal);
    }
  }

  const stats = engine.getStats();
  console.log(SEPARATOR);
  console.log(
    `[AvaxSignal] ✓ Signal engine test complete`
  );
  console.log(
    `[AvaxSignal]   Total: ${stats.total} signals — ` +
      `🟢 ${stats.BUY} BUY | 🔴 ${stats.SELL} SELL | ⚪ ${stats.HOLD} HOLD`
  );

  if (stats.BUY === 0 && stats.SELL === 0) {
    console.log(
      `\n[AvaxSignal] ⚠ No buy/sell signals generated. ` +
        `The simulated data may not have triggered the rules. ` +
        `This is expected if the price movements are too subtle.`
    );
  }

  console.log(SEPARATOR);
}

testSignalEngine().catch((err) => {
  console.error(
    "\n[AvaxSignal] ✗ Signal engine test failed:",
    err.message || err
  );
  process.exit(1);
});
