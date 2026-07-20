/**
 * poolReader.ts — Reads AMM pool reserves, computes price
 *
 * Phase 1: Reads WAVAX/USDC reserves from Trader Joe V1 pool on
 * Avalanche mainnet (read-only). Polls every N seconds, emits price
 * tick events, and optionally stores to MongoDB.
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

// ─── ABIs (minimal — only the functions we call) ─────────────────────

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
];

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

// ─── Config ──────────────────────────────────────────────────────────

const JOE_FACTORY =
  process.env.JOE_FACTORY_ADDRESS ||
  "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";
const WAVAX =
  process.env.WAVAX_ADDRESS ||
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const USDC =
  process.env.USDC_ADDRESS ||
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 10_000;

// Token decimals
const WAVAX_DECIMALS = 18;
const USDC_DECIMALS = 6;

// ─── Types ───────────────────────────────────────────────────────────

export interface PriceTickEvent {
  price: number;
  reserve0: bigint;
  reserve1: bigint;
  token0: string;
  token1: string;
  poolAddress: string;
  timestamp: Date;
}

// ─── PoolReader Class ────────────────────────────────────────────────

export class PoolReader extends EventEmitter {
  private pairContract: Contract | null = null;
  private pairAddress: string = "";
  private token0Address: string = "";
  private token1Address: string = "";
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private dbConnected: boolean = false;
  private tickCount: number = 0;

  constructor() {
    super();
    if (!mainnetProvider) {
      throw new Error(
        "MAINNET_RPC_URL is not configured. Required for price feed (read-only)."
      );
    }
  }

  /**
   * Initialize: find the WAVAX/USDC pair via JoeFactory, set up the pair contract.
   */
  async initialize(): Promise<void> {
    console.log("[AvaxSignal] Finding WAVAX/USDC pair on Trader Joe V1...");

    const factory = new Contract(JOE_FACTORY, FACTORY_ABI, mainnetProvider!);

    // Find pair address via factory
    this.pairAddress = await withRetry(
      () => factory.getPair(WAVAX, USDC),
      "JoeFactory.getPair"
    );

    if (
      !this.pairAddress ||
      this.pairAddress === ethers.ZeroAddress
    ) {
      throw new Error(
        `No WAVAX/USDC pair found on Trader Joe V1 factory (${JOE_FACTORY})`
      );
    }

    console.log(`[AvaxSignal] ✓ Pool found: ${this.pairAddress}`);

    // Set up pair contract
    this.pairContract = new Contract(
      this.pairAddress,
      PAIR_ABI,
      mainnetProvider!
    );

    // Determine token order (token0 vs token1) — critical for price calculation
    this.token0Address = await withRetry(
      () => this.pairContract!.token0(),
      "pair.token0"
    );
    this.token1Address = await withRetry(
      () => this.pairContract!.token1(),
      "pair.token1"
    );

    console.log(`[AvaxSignal]   token0: ${this.token0Address}`);
    console.log(`[AvaxSignal]   token1: ${this.token1Address}`);
  }

  /**
   * Read reserves and compute the current AVAX price in USDC.
   */
  async readPrice(): Promise<PriceTickEvent> {
    if (!this.pairContract) {
      throw new Error("PoolReader not initialized. Call initialize() first.");
    }

    const [reserve0, reserve1] = await withRetry(
      () => this.pairContract!.getReserves(),
      "pair.getReserves"
    );

    // Determine which reserve is WAVAX and which is USDC
    const isToken0WAVAX =
      this.token0Address.toLowerCase() === WAVAX.toLowerCase();

    const wavaxReserve = isToken0WAVAX ? reserve0 : reserve1;
    const usdcReserve = isToken0WAVAX ? reserve1 : reserve0;

    // Compute price: USDC per AVAX
    // Adjust for decimal difference (WAVAX=18, USDC=6)
    // price = (usdcReserve / 10^6) / (wavaxReserve / 10^18)
    //       = (usdcReserve * 10^18) / (wavaxReserve * 10^6)
    //       = (usdcReserve * 10^12) / wavaxReserve
    const decimalAdjustment = 10n ** BigInt(WAVAX_DECIMALS - USDC_DECIMALS); // 10^12
    const price =
      Number((usdcReserve * decimalAdjustment * 10000n) / wavaxReserve) /
      10000;

    const tick: PriceTickEvent = {
      price,
      reserve0: BigInt(reserve0),
      reserve1: BigInt(reserve1),
      token0: this.token0Address,
      token1: this.token1Address,
      poolAddress: this.pairAddress,
      timestamp: new Date(),
    };

    return tick;
  }

  /**
   * Start polling the pool for price ticks.
   */
  async start(persistToDb: boolean = true): Promise<void> {
    if (this.isRunning) {
      console.warn("[AvaxSignal] PoolReader is already running.");
      return;
    }

    await this.initialize();

    // Optionally connect to MongoDB
    if (persistToDb) {
      this.dbConnected = await connectDB();
    }

    this.isRunning = true;
    console.log(
      `[AvaxSignal] Polling price every ${POLL_INTERVAL_MS / 1000}s...`
    );

    // Do one immediate read
    await this.pollOnce();

    // Then set up interval
    this.pollTimer = setInterval(() => {
      this.pollOnce().catch((err) => {
        console.error("[AvaxSignal] Poll error:", err.message || err);
      });
    }, POLL_INTERVAL_MS);
  }

  /**
   * Single poll iteration — read price, emit event, optionally persist.
   */
  private async pollOnce(): Promise<void> {
    try {
      const tick = await this.readPrice();
      this.tickCount++;

      console.log(
        `[AvaxSignal] Tick #${this.tickCount} — AVAX/USDC: $${tick.price.toFixed(4)} | ` +
          `Reserves: ${ethers.formatEther(tick.reserve0)} / ${ethers.formatUnits(tick.reserve1, USDC_DECIMALS)}`
      );

      // Emit event for downstream consumers (signal engine, socket.io, etc.)
      this.emit("priceTick", tick);

      // Persist to MongoDB if connected
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
            "[AvaxSignal] ⚠ Failed to save tick to MongoDB:",
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

  /**
   * Stop polling.
   */
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

  /**
   * Get current state info.
   */
  getInfo(): {
    isRunning: boolean;
    tickCount: number;
    pairAddress: string;
    pollIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      tickCount: this.tickCount,
      pairAddress: this.pairAddress,
      pollIntervalMs: POLL_INTERVAL_MS,
    };
  }
}
