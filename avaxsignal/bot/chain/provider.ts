/**
 * provider.ts — ethers.js RPC provider setup (Fuji testnet + optional mainnet read)
 *
 * Pure read-only module. No private keys loaded here.
 * Security rule: read-only chain calls require no private key — keep them
 * separate from the execution module (Rules.md #4).
 */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const FUJI_RPC_URL =
  process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/C/rpc";
const FUJI_CHAIN_ID = Number(process.env.FUJI_CHAIN_ID) || 43113;

/**
 * Fuji testnet provider — used for all development and MVP features.
 */
export const fujiProvider = new ethers.JsonRpcProvider(FUJI_RPC_URL, {
  name: "avalanche-fuji",
  chainId: FUJI_CHAIN_ID,
});

/**
 * Optional mainnet provider — read-only, for live price comparison if desired.
 * Only created if MAINNET_RPC_URL is configured.
 */
export const mainnetProvider = process.env.MAINNET_RPC_URL
  ? new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, {
      name: "avalanche-mainnet",
      chainId: 43114,
    })
  : null;

/**
 * Retry wrapper for RPC calls.
 * Max 3 attempts, exponential backoff (Rules.md error handling).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxAttempts;
      const backoffMs = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
      console.error(
        `[AvaxSignal] ${label} — attempt ${attempt}/${maxAttempts} failed:`,
        err instanceof Error ? err.message : err
      );
      if (isLast) throw err;
      console.log(`[AvaxSignal] Retrying in ${backoffMs}ms...`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new Error(`${label} failed after ${maxAttempts} attempts`);
}
