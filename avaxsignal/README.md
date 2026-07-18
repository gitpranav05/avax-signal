# AvaxSignal

On-chain algorithmic trading signal dashboard for Avalanche DeFi — reads live DEX pool data, runs proven technical indicators (EMA/RSI/MACD/Bollinger Bands) against it, and surfaces buy/sell signals with paper-trading and testnet execution, in a real-time web dashboard.

## Quick Start

### Prerequisites
- Node.js 18+ (via NVM recommended)
- npm

### Setup

```bash
# Install dependencies
cd avaxsignal
npm install

# Create your environment file
cp .env.example .env

# (Optional) Add your Fuji testnet wallet private key to .env
# EXECUTION_WALLET_PRIVATE_KEY=<your-testnet-only-key>
```

### Verify Environment (Phase 0)

```bash
npm run verify
```

This connects to the Avalanche Fuji testnet and prints:
- Current block number
- Your wallet's AVAX balance (if a key is configured)

### Fuji Testnet Setup

1. Install [MetaMask](https://metamask.io/) or [Core Wallet](https://core.app/)
2. Add Fuji Testnet:
   - **Network Name:** Avalanche Fuji C-Chain
   - **RPC URL:** `https://api.avax-test.network/ext/C/rpc`
   - **Chain ID:** `43113`
   - **Currency Symbol:** AVAX
   - **Explorer:** `https://testnet.snowtrace.io/`
3. Claim free test AVAX from the [Avalanche Faucet](https://faucet.avax.network/)

## Project Structure

See [Architecture.md](files/Architecture.md) for the full architecture and data flow.

## Security

- **TESTNET ONLY** — never use a mainnet private key in this project
- `.env` is git-ignored from commit one — never commit secrets
- See [Rules.md](files/Rules.md) for the full security policy

## Build Phases

See [Phases.md](files/Phases.md) for the implementation timeline.

## License

Private — not yet open-sourced.
