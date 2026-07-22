/**
 * poolReader.ts — Reads on-chain AVAX price
 *
 * Primary source: Chainlink AVAX/USD price feed on Avalanche mainnet.
 * Secondary source: Trader Joe V1 WAVAX/USDC pool reserves.
 *
 * Chainlink is used because it aggregates prices from multiple exchanges
 * and updates frequently. The Trader Joe V1 pool has very low volume
 * (most activity moved to V2/V2.1 Liquidity Book) so its reserves
 * barely change — giving a flat, stale price.
 *
 * Uses mainnet for real price data (Architecture.md: "mainnet read-only").
 * No private key needed — pure read calls.
 */

import { ethers, Contract } from "ethers";
import { EventEmitter } from "events";
import dotenv from "dotenv";
import { mainnetProvider, withRetry } from "./provider";
import { PriceTick, IPriceTick, connectDB } from "../models";

dotenv.config();

// ─── ABIs ────────────────────────────────────────────────────────────

const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
];

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

// ─── Config ──────────────────────────────────────────────────────────

// Chainlink AVAX/USD Price Feed on Avalanche C-Chain mainnet
const CHAINLINK_AVAX_USD =
  process.env.CHAINLINK_AVAX_USD ||
  "0x0A77230d17318075983913bC2145DB16C7366156";

const JOE_FACTORY =
  process.env.JOE_FACTORY_ADDRESS ||
  "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";
const WAVAX =
  process.env.WAVAX_ADDRESS ||
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const USDC =
  process.env.USDC_ADDRESS ||
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 2_000;

// ─── Types ───────────────────────────────────────────────────────────

export interface PriceTickEvent {
  price: number;
  source: "chainlink" | "pool";
  reserve0: bigint;
  reserve1: bigint;
  token0: string;
  token1: string;
  poolAddress: string;
  timestamp: Date;
}

// ─── PoolReader Class ────────────────────────────────────────────────

export class PoolReader extends EventEmitter {
  private chainlinkContract: Contract | null = null;
  private chainlinkDecimals: number = 8;
  private pairContract: Contract | null = null;
  private pairAddress: string = "";
  private token0Address: string = "";
  private token1Address: string = "";
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private dbConnected: boolean = false;
  private tickCount: number = 0;
  private lastPrice: number = 0;

  constructor() {
    super();
    if (!mainnetProvider) {
      throw new Error(
        "MAINNET_RPC_URL is not configured. Required for price feed (read-only)."
      );
    }
  }

  /**
   * Initialize: set up Chainlink feed + optionally Trader Joe pair.
   */
  async initialize(): Promise<void> {
    // 1. Chainlink AVAX/USD (primary)
    console.log("[AvaxSignal] Setting up Chainlink AVAX/USD price feed...");
    this.chainlinkContract = new Contract(
      CHAINLINK_AVAX_USD,
      CHAINLINK_ABI,
      mainnetProvider!
    );

    this.chainlinkDecimals = Number(await withRetry(
      () => this.chainlinkContract!.decimals(),
      "chainlink.decimals"
    ));
    console.log(
      `[AvaxSignal] ✓ Chainlink feed: ${CHAINLINK_AVAX_USD} (${this.chainlinkDecimals} decimals)`
    );

    // 2. Trader Joe V1 pair (secondary — for reserves info)
    try {
      console.log("[AvaxSignal] Finding WAVAX/USDC pair on Trader Joe V1...");
      const factory = new Contract(JOE_FACTORY, FACTORY_ABI, mainnetProvider!);
      this.pairAddress = await withRetry(
        () => factory.getPair(WAVAX, USDC),
        "JoeFactory.getPair"
      );

      if (this.pairAddress && this.pairAddress !== ethers.ZeroAddress) {
        this.pairContract = new Contract(
          this.pairAddress,
          PAIR_ABI,
          mainnetProvider!
        );
        this.token0Address = await withRetry(
          () => this.pairContract!.token0(),
          "pair.token0"
        );
        this.token1Address = await withRetry(
          () => this.pairContract!.token1(),
          "pair.token1"
        );
        console.log(`[AvaxSignal] ✓ Pool found: ${this.pairAddress}`);
      }
    } catch (err) {
      console.warn(
        "[AvaxSignal] ⚠ Trader Joe pair not available (Chainlink only mode)"
      );
    }
  }

  /**
   * Read the latest AVAX/USD price from Chainlink.
   */
  async readPrice(): Promise<PriceTickEvent> {
    if (!this.chainlinkContract) {
      throw new Error("PoolReader not initialized. Call initialize() first.");
    }

    const [, answer] = await withRetry(
      () => this.chainlinkContract!.latestRoundData(),
      "chainlink.latestRoundData"
    );

    // answer is a BigInt in ethers v6 — convert safely
    const price = Number(BigInt(answer)) / Math.pow(10, this.chainlinkDecimals);

    // Optionally read pool reserves (non-blocking, for info only)
    let reserve0 = 0n;
    let reserve1 = 0n;

    if (this.pairContract) {
      try {
        const reserves = await this.pairContract.getReserves();
        reserve0 = BigInt(reserves[0]);
        reserve1 = BigInt(reserves[1]);
      } catch {
        // Non-fatal
      }
    }

    this.lastPrice = price;

    return {
      price,
      source: "chainlink",
      reserve0,
      reserve1,
      token0: this.token0Address,
      token1: this.token1Address,
      poolAddress: this.pairAddress,
      timestamp: new Date(),
    };
  }

  /**
   * Start polling for price ticks.
   */
  async start(persistToDb: boolean = true): Promise<void> {
    if (this.isRunning) {
      console.warn("[AvaxSignal] PoolReader is already running.");
      return;
    }

    await this.initialize();

    if (persistToDb) {
      this.dbConnected = await connectDB();
    }

    this.isRunning = true;
    console.log(
      `[AvaxSignal] Polling price every ${POLL_INTERVAL_MS / 1000}s (Chainlink AVAX/USD)...`
    );

    await this.pollOnce();

    this.pollTimer = setInterval(() => {
      this.pollOnce().catch((err) => {
        console.error("[AvaxSignal] Poll error:", err.message || err);
      });
    }, POLL_INTERVAL_MS);
  }

  /**
   * Single poll iteration.
   */
  private async pollOnce(): Promise<void> {
    try {
      const tick = await this.readPrice();
      this.tickCount++;

      // Log every 5th tick to reduce noise at 2s intervals
      if (this.tickCount % 5 === 1 || this.tickCount <= 3) {
        console.log(
          `[AvaxSignal] Tick #${this.tickCount} — AVAX/USD: $${tick.price.toFixed(4)} (Chainlink)`
        );
      }

      this.emit("priceTick", tick);

      if (this.dbConnected) {
        try {
          await PriceTick.create({
            price: tick.price,
            reserve0: tick.reserve0.toString(),
            reserve1: tick.reserve1.toString(),
            token0: tick.token0,
            token1: tick.token1,
            poolAddress: tick.poolAddress,
            network: "mainnet",
            timestamp: tick.timestamp,
          });
        } catch (dbErr) {
          console.warn(
            "[AvaxSignal] ⚠ Failed to save tick:",
            dbErr instanceof Error ? dbErr.message : dbErr
          );
        }
      }
    } catch (err) {
      console.error(
        "[AvaxSignal] ✗ Price read failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    console.log(
      `[AvaxSignal] PoolReader stopped after ${this.tickCount} ticks.`
    );
  }

  getInfo() {
    return {
      isRunning: this.isRunning,
      tickCount: this.tickCount,
      pairAddress: this.pairAddress,
      pollIntervalMs: POLL_INTERVAL_MS,
    };
  }
}
