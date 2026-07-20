/**
 * testPriceFeed.ts — Phase 1 verification script
 *
 * Connects to Avalanche mainnet (read-only), finds the WAVAX/USDC pool
 * on Trader Joe V1, reads 5 price ticks, then exits.
 *
 * Run: npm run test:price
 *
 * "Done when": price ticks are flowing and logged, matching the pool's
 * real-time price (spot-check against a DEX UI).
 */

import { PoolReader, PriceTickEvent } from "./poolReader";
import { disconnectDB } from "../models";

const MAX_TICKS = 5;
const SEPARATOR = "─".repeat(50);

async function testPriceFeed(): Promise<void> {
  console.log(SEPARATOR);
  console.log("[AvaxSignal] Phase 1 — Price Feed Test");
  console.log(SEPARATOR);

  const reader = new PoolReader();
  let tickCount = 0;

  // Listen for price ticks
  reader.on("priceTick", (tick: PriceTickEvent) => {
    tickCount++;
    if (tickCount >= MAX_TICKS) {
      console.log(`\n${SEPARATOR}`);
      console.log(
        `[AvaxSignal] ✓ ${MAX_TICKS} ticks received. Price feed working!`
      );
      console.log(
        "[AvaxSignal] Spot-check: compare price above with https://traderjoexyz.com/ or CoinGecko"
      );
      console.log(SEPARATOR);

      reader.stop();
      disconnectDB().then(() => process.exit(0));
    }
  });

  // Start polling (skip MongoDB persistence for this test — set to false)
  await reader.start(false);
}

testPriceFeed().catch((err) => {
  console.error("\n[AvaxSignal] ✗ Price feed test failed:", err.message || err);
  process.exit(1);
});
