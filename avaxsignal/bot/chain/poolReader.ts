/**
 * poolReader.ts — Reads AMM pool reserves, computes price
 *
 * Implemented in Phase 1. See Phases.md.
 *
 * Responsibilities:
 *   - Read reserves from one AVAX/USDC DEX pool contract
 *   - Compute spot price from reserves
 *   - Poll every N seconds, emit price tick events
 *   - Store ticks in MongoDB (PriceTick collection)
 */

export {};
