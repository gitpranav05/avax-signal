/**
 * paperBroker.ts — Simulated trade logging
 *
 * Receives buy/sell signals from signalEngine, executes simulated trades,
 * tracks portfolio state and P&L.
 * Starts with a virtual USDC balance ($10,000).
 */

import { EventEmitter } from "events";
import { Signal } from "../signals/signalEngine";

// ─── Types ───────────────────────────────────────────────────────────

export interface Trade {
  type: "BUY" | "SELL";
  price: number;
  amount: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  balance: number;
  timestamp: Date;
}

export interface PortfolioState {
  usdcBalance: number;
  avaxAmount: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  totalRealizedPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

// ─── PaperBroker ─────────────────────────────────────────────────────

const DEFAULT_BALANCE = 10_000;
const POSITION_SIZE_PERCENT = 0.25;

export class PaperBroker extends EventEmitter {
  private usdcBalance: number;
  private avaxAmount: number = 0;
  private avgEntryPrice: number = 0;
  private currentPrice: number = 0;
  private totalRealizedPnl: number = 0;
  private trades: Trade[] = [];
  private winningTrades: number = 0;
  private losingTrades: number = 0;

  constructor(initialBalance: number = DEFAULT_BALANCE) {
    super();
    this.usdcBalance = initialBalance;
  }

  processSignal(signal: Signal): Trade | null {
    this.currentPrice = signal.price;

    if (signal.type === "BUY") return this.executeBuy(signal);
    if (signal.type === "SELL") return this.executeSell(signal);

    this.emitPortfolioUpdate();
    return null;
  }

  updatePrice(price: number): void {
    this.currentPrice = price;
    this.emitPortfolioUpdate();
  }

  private executeBuy(signal: Signal): Trade | null {
    if (this.avaxAmount > 0 || this.usdcBalance <= 0) return null;

    const spendAmount = this.usdcBalance * POSITION_SIZE_PERCENT;
    const avaxBought = spendAmount / signal.price;

    console.log(
      `[AvaxSignal] 📝 Paper BUY: $${spendAmount.toFixed(2)} → ${avaxBought.toFixed(4)} AVAX @ $${signal.price.toFixed(4)}`
    );

    this.usdcBalance -= spendAmount;
    this.avaxAmount = avaxBought;
    this.avgEntryPrice = signal.price;

    const trade: Trade = {
      type: "BUY",
      price: signal.price,
      amount: avaxBought,
      value: spendAmount,
      pnl: 0,
      pnlPercent: 0,
      balance: this.usdcBalance,
      timestamp: new Date(),
    };

    this.trades.push(trade);
    this.emit("trade", trade);
    this.emitPortfolioUpdate();
    return trade;
  }

  private executeSell(signal: Signal): Trade | null {
    if (this.avaxAmount <= 0) return null;

    const saleValue = this.avaxAmount * signal.price;
    const pnl = saleValue - this.avaxAmount * this.avgEntryPrice;
    const pnlPercent =
      this.avgEntryPrice > 0
        ? ((signal.price - this.avgEntryPrice) / this.avgEntryPrice) * 100
        : 0;

    console.log(
      `[AvaxSignal] 📝 Paper SELL: ${this.avaxAmount.toFixed(4)} AVAX @ $${signal.price.toFixed(4)} → $${saleValue.toFixed(2)} (P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)})`
    );

    this.usdcBalance += saleValue;
    this.totalRealizedPnl += pnl;
    if (pnl > 0) this.winningTrades++;
    else if (pnl < 0) this.losingTrades++;

    const trade: Trade = {
      type: "SELL",
      price: signal.price,
      amount: this.avaxAmount,
      value: saleValue,
      pnl,
      pnlPercent,
      balance: this.usdcBalance,
      timestamp: new Date(),
    };

    this.avaxAmount = 0;
    this.avgEntryPrice = 0;

    this.trades.push(trade);
    this.emit("trade", trade);
    this.emitPortfolioUpdate();
    return trade;
  }

  private emitPortfolioUpdate(): void {
    this.emit("portfolioUpdate", this.getPortfolio());
  }

  getPortfolio(): PortfolioState {
    const positionValue = this.avaxAmount * this.currentPrice;
    const costBasis = this.avaxAmount * this.avgEntryPrice;
    const unrealizedPnl = this.avaxAmount > 0 ? positionValue - costBasis : 0;
    const unrealizedPnlPercent =
      costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    return {
      usdcBalance: this.usdcBalance,
      avaxAmount: this.avaxAmount,
      avgEntryPrice: this.avgEntryPrice,
      currentPrice: this.currentPrice,
      unrealizedPnl,
      unrealizedPnlPercent,
      totalRealizedPnl: this.totalRealizedPnl,
      totalTrades: this.trades.length,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
    };
  }

  getTrades(): Trade[] { return [...this.trades]; }
  getRecentTrades(n: number = 50): Trade[] { return this.trades.slice(-n); }

  manualBuy(): Trade | null {
    if (this.currentPrice <= 0) return null;
    return this.executeBuy({
      type: "BUY",
      price: this.currentPrice,
      timestamp: new Date(),
      reasons: ["Manual execution"],
      confidence: 100,
    });
  }

  manualSell(): Trade | null {
    if (this.currentPrice <= 0) return null;
    return this.executeSell({
      type: "SELL",
      price: this.currentPrice,
      timestamp: new Date(),
      reasons: ["Manual execution"],
      confidence: 100,
    });
  }

  reset(initialBalance: number = DEFAULT_BALANCE): PortfolioState {
    this.usdcBalance = initialBalance;
    this.avaxAmount = 0;
    this.avgEntryPrice = 0;
    this.totalRealizedPnl = 0;
    this.trades = [];
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.emitPortfolioUpdate();
    return this.getPortfolio();
  }
}
