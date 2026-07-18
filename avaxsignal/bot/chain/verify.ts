/**
 * verify.ts — Phase 0 verification script
 *
 * Connects to Fuji testnet and prints:
 *   1. Current block number
 *   2. Wallet AVAX balance (if EXECUTION_WALLET_PRIVATE_KEY is set)
 *
 * Run: npm run verify
 *
 * "Done when": this script prints live Fuji block number + test wallet balance.
 */

import { ethers } from "ethers";
import { fujiProvider, withRetry } from "./provider";

const SEPARATOR = "─".repeat(50);

async function verify(): Promise<void> {
  console.log(SEPARATOR);
  console.log("[AvaxSignal] Phase 0 — Environment Verification");
  console.log(SEPARATOR);

  // 1. Check RPC connection + block number
  console.log("\n[AvaxSignal] Connecting to Fuji testnet (chain ID 43113)...");

  const network = await withRetry(
    () => fujiProvider.getNetwork(),
    "getNetwork"
  );
  console.log(
    `[AvaxSignal] ✓ Network: ${network.name} (chain ID ${network.chainId})`
  );

  const blockNumber = await withRetry(
    () => fujiProvider.getBlockNumber(),
    "getBlockNumber"
  );
  console.log(`[AvaxSignal] ✓ Current block: ${blockNumber}`);

  // 2. Check wallet balance (if key is configured)
  const privateKey = process.env.EXECUTION_WALLET_PRIVATE_KEY;

  if (privateKey && privateKey.trim().length > 0) {
    console.log("\n[AvaxSignal] Checking wallet balance...");

    const wallet = new ethers.Wallet(privateKey, fujiProvider);
    console.log(`[AvaxSignal]   Address: ${wallet.address}`);

    const balanceWei = await withRetry(
      () => fujiProvider.getBalance(wallet.address),
      "getBalance"
    );
    const balanceAvax = ethers.formatEther(balanceWei);
    console.log(`[AvaxSignal] ✓ Balance: ${balanceAvax} AVAX`);

    if (balanceWei === 0n) {
      console.log(
        "\n[AvaxSignal] ⚠ Wallet is empty. Claim Fuji AVAX from: https://faucet.avax.network/"
      );
    }
  } else {
    console.log(
      "\n[AvaxSignal] ℹ No EXECUTION_WALLET_PRIVATE_KEY set in .env — skipping balance check."
    );
    console.log(
      "[AvaxSignal]   To complete Phase 0 fully, add a testnet wallet key to .env"
    );
  }

  console.log(`\n${SEPARATOR}`);
  console.log("[AvaxSignal] Phase 0 verification complete.");
  console.log(SEPARATOR);
}

verify().catch((err) => {
  console.error("\n[AvaxSignal] ✗ Verification failed:", err.message || err);
  process.exit(1);
});
