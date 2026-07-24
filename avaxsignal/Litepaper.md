# AvaxSignal — Litepaper

**Version 1.0 — July 2026**

---

## 1. What is AvaxSignal?

AvaxSignal is an open-source, on-chain algorithmic trading signal dashboard for Avalanche DeFi. It reads live price data directly from the Avalanche C-Chain, runs a proven technical indicator engine, and delivers real-time buy/sell signals through a live web dashboard — with paper trading simulation and real testnet swap execution.

**One-liner:** *Systematic, indicator-driven trading signals for Avalanche DeFi, running entirely on-chain data.*

---

## 2. The Problem

Retail DeFi traders on Avalanche make entry/exit decisions by gut feel, Twitter sentiment, or lagging CEX charts. There are no native, code-driven signal tools built specifically for Avalanche's on-chain AMM data:

- Existing algo-trading bots are built for centralized exchanges (Binance, Coinbase) — they do not read on-chain AMM reserves or DEX prices
- Manual DeFi trading is reactive, emotional, and inconsistent
- On-chain data is publicly available and deterministic — the infrastructure for systematic trading exists, but the tooling does not

---

## 3. The Solution

AvaxSignal bridges this gap with a four-layer pipeline:

```
Avalanche C-Chain (live data)
        ↓
Chainlink AVAX/USD Oracle  →  price tick every 2s
        ↓
        Indicator Engine  →  EMA · RSI · MACD · Bollinger Bands
        ↓
Signal Generator  →  BUY / SELL / HOLD + reasons
        ↓
Live Dashboard  →  chart · indicators · signals · paper P&L · testnet execution
```

### Key capabilities
| er BB → BUY; RSI > 70 + price ≥ upper BB → SELL; MACD histogram crossover confirmation |Capability | Detail |
|---|---|
| **Price source** | Chainlink AVAX/USD (mainnet oracle, read-only) |
| **Polling** | Every 2 seconds |
| **Indicators** | EMA 12/26, RSI 14, MACD 12/26/9, Bollinger Bands 20 |
| **Signal rules** | RSI < 30 + price ≤ low
| **Paper trading** | 25% position sizing, full P&L tracking |
| **Execution** | Manual testnet swap via Trader Joe V1 on Fuji (chain ID 43113) |
| **Dashboard** | React + Socket.IO, live price chart, signal feed, portfolio |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Avalanche C-Chain                          │
│  Chainlink oracle (mainnet read)  +  Trader Joe V1     │
└───────────────────┬─────────────────────────────────────┘
                    │ ethers.js v6 (2s poll)
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js / TypeScript)             │
│  PoolReader → IndicatorEngine → SignalEngine            │
│  PaperBroker → Express API + Socket.IO                 │
└───────────────────┬─────────────────────────────────────┘
                    │ WebSocket
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Dashboard (React / Vite)                   │
│  Live chart · Indicators · Signal feed · Portfolio      │
│  Fuji Wallet panel · Execute Swap button               │
└─────────────────────────────────────────────────────────┘
```

**Tech stack:** TypeScript, Node.js, Express, Socket.IO, ethers.js v6, React, Vite, TradingView lightweight-charts, PM2, GCP

---

## 5. Demo Metrics (Live Session)

From a verified live demo session on Fuji testnet:

| Metric | Value |
|---|---|
| Live price feed | ✅ Chainlink AVAX/USD, updating every 2s |
| Indicators active | ✅ EMA, RSI, MACD, BB — all producing values |
| Signals generated | ✅ BUY/SELL triggered on RSI + BB confirmation |
| Paper trades | ✅ Multiple BUY/SELL with P&L tracking |
| Testnet tx | ✅ Real tx hash on Snowtrace (Fuji) |
| Wallet balance | ✅ Real Fuji AVAX balance shown in UI |

---

## 6. Security & Risk Model

AvaxSignal is built with an explicit safety-first approach:

- **Testnet only** — execution wallet is Fuji testnet only (chain ID 43113 validated before every tx)
- **No mainnet signing** — price data is read-only from mainnet; no mainnet private key anywhere in the system
- **Pre-sign logging** — every transaction logs what it will do before signing
- **No smart contract deployment** — MVP reads and calls existing deployed contracts only
- **No user funds** — users connect read-only; the execution wallet is a dedicated testnet wallet

---

## 7. Roadmap

### MVP (shipped)
- [x] Live on-chain price feed (Chainlink oracle)
- [x] 4 technical indicators (EMA, RSI, MACD, BB)
- [x] Rule-based signal engine
- [x] Paper trading simulator with P&L
- [x] Live React dashboard with Socket.IO
- [x] Fuji wallet display + manual testnet swap execution

### Near-term (post-grant)
- [ ] Multiple trading pairs (AVAX/USDC, JOE/AVAX, etc.)
- [ ] Configurable strategy parameters from the UI
- [ ] Automated testnet execution (signal-triggered, not just manual)
- [ ] Signal backtesting against historical on-chain data

### Long-term
- [ ] Multi-DEX price comparison and arbitrage signals
- [ ] User-defined indicator rules (no-co       de strategy builder)
- [ ] Strategy NFTs / shareable signal configs on-chain

---

## 8. Team

**Pranav** — Full-stack developer. Building on Avalanche for the first time with AvaxSignal.

---

## 9. Grant Alignment

AvaxSignal is submitted for the **Avalanche Team1 Mini Grant**.

The project demonstrates:
1. **Working prototype** — deployed, demoable, not a mockup
2. **Real on-chain data** — Chainlink oracle + Trader Joe V1 pool
3. **Proven signal engine** — adapted from a live production trading system
4. **Real testnet transaction** — Snowtrace tx hash as proof of execution
5. **Market thinking** — solves a real gap for Avalanche DeFi traders
6. **Ability to ship** — full MVP built and deployed within the grant timeline

---

*AvaxSignal is open-source. Built on Avalanche.*
