# AvaxSignal

**On-chain algorithmic trading signal dashboard for Avalanche DeFi.**

Reads live Chainlink AVAX/USD price data, runs technical indicators (EMA, RSI, MACD, Bollinger Bands), surfaces buy/sell signals, simulates paper trades, and executes real testnet swaps — all from a live React dashboard.

---

## Features

- 📈 **Live price feed** — Chainlink AVAX/USD oracle, polled every 2 seconds
- 📊 **4 technical indicators** — EMA (12/26), RSI (14), MACD (12/26/9), Bollinger Bands (20)
- 🎯 **Signal engine** — rule-based BUY/SELL/HOLD with reasons
- 💼 **Paper broker** — simulated trades with P&L tracking (25% position sizing)
- 🖥️ **Live dashboard** — real-time chart, indicator panel, signal feed, portfolio
- ⛓️ **Fuji testnet execution** — real on-chain swap triggered from the UI
- 🔐 **Testnet only** — no mainnet execution, no real funds at risk

---

## Stack

| Layer | Tech |
|---|---|
| Chain | Avalanche C-Chain (Fuji testnet / mainnet read-only) |
| Price | Chainlink AVAX/USD oracle + Trader Joe V1 pool |
| Backend | Node.js, TypeScript, Express, Socket.IO |
| Frontend | React, Vite, TradingView lightweight-charts |
| Chain lib | ethers.js v6 |
| Process | PM2 |

---

## Quick Start (Dev)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install dependencies
```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — add your EXECUTION_WALLET_PRIVATE_KEY (testnet only)
```

### 3. Run (two terminals)

**Terminal 1 — Backend:**
```bash
npm run dev:server
```

**Terminal 2 — Frontend:**
```bash
cd client && npm run dev
```

Open **http://localhost:5173**

---

## Production Deploy (GCP VM)

### Prerequisites on VM
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2
```

### Deploy steps

```bash
# 1. Clone / copy project to VM
git clone <your-repo> /opt/avaxsignal
cd /opt/avaxsignal

# 2. Install backend dependencies
npm install

# 3. Build frontend
cd client && npm install && npm run build && cd ..

# 4. Set up environment
cp .env.example .env
nano .env   # fill in your values

# 5. Create logs directory
mkdir -p logs client/logs

# 6. Start with PM2
pm2 start ecosystem.config.js

# 7. Auto-restart on VM reboot
pm2 save
pm2 startup   # follow the printed command
```

### Check status
```bash
pm2 status          # see both processes
pm2 logs            # live log stream
pm2 restart all     # restart everything
```

### Ports
| Service | Port |
|---|---|
| Backend API + Socket.IO | 3001 |
| Dashboard | 4173 |

> **GCP Firewall:** Open ports 3001 and 4173 in your GCP VPC firewall rules.

---

## Environment Variables

```bash
FUJI_RPC_URL=https://api.avax-test.network/ext/C/rpc
FUJI_CHAIN_ID=43113
MAINNET_RPC_URL=https://api.avax.network/ext/bc/C/rpc
POLL_INTERVAL_MS=2000
CHAINLINK_AVAX_USD=0x0A77230d17318075983913bC2145DB16C7366156
JOE_FACTORY_ADDRESS=0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10
WAVAX_ADDRESS=0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7
USDC_ADDRESS=0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E
JOE_ROUTER_FUJI=0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901
EXECUTION_WALLET_PRIVATE_KEY=<testnet-only-never-mainnet>
PORT=3001
```

---

## Security

- Testnet only — private key must never hold mainnet funds
- `.env` is in `.gitignore` — never committed
- All transactions log a pre-sign summary before executing
- Chain ID 43113 validated before every transaction

---

## Project Structure

```
avaxsignal/
├── bot/
│   ├── chain/          # Provider, PoolReader, Executor
│   ├── indicators/     # EMA, RSI, MACD, Bollinger Bands
│   ├── signals/        # SignalEngine (rule-based)
│   └── broker/         # PaperBroker (simulated trading)
├── server/
│   ├── api/            # Express REST routes
│   └── socket.ts       # Socket.IO relay
├── client/             # React + Vite dashboard
├── files/              # PRD, Architecture, Rules, Phases, Memory, Litepaper
├── ecosystem.config.js # PM2 deploy config
└── .env                # Environment variables (never commit)
```

---

## Grant
Built for the **Avalanche Team1 Mini Grant**. See [`files/Litepaper.md`](files/Litepaper.md).
