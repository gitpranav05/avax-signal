/**
 * WalletPanel.tsx — MetaMask wallet UI
 *
 * Replaces the server-side private key wallet with client-side MetaMask signing.
 * Users connect their own MetaMask → transactions signed locally → no keys on server.
 */

import React, { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

type SwapState = 'idle' | 'loading' | 'success' | 'error'

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export const WalletPanel: React.FC = () => {
  const {
    account, balance, chainId, isConnected, isCorrectNetwork,
    isConnecting, error: walletError,
    connect, disconnect, switchToFuji, executeSwap, refreshBalance,
  } = useWallet()

  const [swapState, setSwapState] = useState<SwapState>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [snowtraceUrl, setSnowtraceUrl] = useState<string | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)

  const handleSwap = async () => {
    setSwapState('loading')
    setTxHash(null)
    setSnowtraceUrl(null)
    setSwapError(null)

    try {
      const result = await executeSwap('0.01')
      setTxHash(result.txHash)
      setSnowtraceUrl(result.snowtraceUrl)
      setSwapState('success')
      // Refresh balance after tx
      setTimeout(refreshBalance, 3000)
    } catch (err: any) {
      setSwapError(err.message ?? 'Transaction failed')
      setSwapState('error')
    }
  }

  // ── Not connected ─────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="wallet-panel">
        <div className="wallet-header">
          <span className="wallet-title">Wallet</span>
          <span className="wallet-network-badge">⛰ FUJI TESTNET</span>
        </div>

        <div className="wallet-connect-prompt">
          <div className="wallet-connect-icon">🦊</div>
          <div className="wallet-connect-text">
            Connect MetaMask to execute real on-chain transactions on Fuji Testnet
          </div>
          <button
            className="wallet-connect-btn"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <><span className="swap-spinner" /> Connecting…</>
            ) : (
              '🔗 Connect Wallet'
            )}
          </button>
          {walletError && (
            <div className="wallet-connect-error">{walletError}</div>
          )}
          <div className="wallet-connect-note">
            Need testnet AVAX?{' '}
            <a href="https://faucet.avax.network/" target="_blank" rel="noopener noreferrer">
              faucet.avax.network ↗
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Wrong network ─────────────────────────────────────────────────

  if (!isCorrectNetwork) {
    return (
      <div className="wallet-panel">
        <div className="wallet-header">
          <span className="wallet-title">Wallet</span>
          <span className="wallet-network-badge wallet-network-badge--wrong">⚠ WRONG NETWORK</span>
        </div>
        <div className="wallet-info">
          <div className="wallet-row">
            <span className="wallet-label">Address</span>
            <span className="wallet-value wallet-address">{truncateAddr(account!)}</span>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">Chain ID</span>
            <span className="wallet-value" style={{ color: 'var(--sell)' }}>{chainId} (need 43113)</span>
          </div>
        </div>
        <button className="swap-btn swap-btn--wrong-network" onClick={switchToFuji}>
          ⛰ Switch to Fuji Testnet
        </button>
        <button className="wallet-disconnect-btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    )
  }

  // ── Connected + correct network ───────────────────────────────────

  return (
    <div className="wallet-panel">
      <div className="wallet-header">
        <span className="wallet-title">Fuji Wallet</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="wallet-connected-dot" />
          <span className="wallet-network-badge">⛰ TESTNET</span>
        </div>
      </div>

      <div className="wallet-info">
        <div className="wallet-row">
          <span className="wallet-label">Address</span>
          <span className="wallet-value wallet-address" title={account!}>
            {truncateAddr(account!)}
          </span>
        </div>
        <div className="wallet-row">
          <span className="wallet-label">Balance</span>
          <span className="wallet-value wallet-balance">
            {balance ?? '…'} AVAX
          </span>
        </div>
        <div className="wallet-row">
          <span className="wallet-label">Chain ID</span>
          <span className="wallet-value">43113</span>
        </div>
      </div>

      <button
        className={`swap-btn swap-btn--${swapState}`}
        onClick={handleSwap}
        disabled={swapState === 'loading'}
      >
        {swapState === 'loading' ? (
          <><span className="swap-spinner" /> Waiting for MetaMask…</>
        ) : swapState === 'success' ? (
          '✓ TX Confirmed'
        ) : (
          '⚡ Execute Testnet Swap (0.01 AVAX)'
        )}
      </button>

      {swapState === 'success' && txHash && (
        <div className="swap-result swap-result--success">
          <div className="swap-result-label">Transaction Hash</div>
          <a
            className="swap-tx-link"
            href={snowtraceUrl!}
            target="_blank"
            rel="noopener noreferrer"
            title={txHash}
          >
            {truncateAddr(txHash)}
            <span className="swap-external-icon">↗</span>
          </a>
          <div className="swap-result-sub">View on Snowtrace ↗</div>
        </div>
      )}

      {swapState === 'error' && swapError && (
        <div className="swap-result swap-result--error">
          <div className="swap-result-label">Error</div>
          <div className="swap-error-msg">{swapError}</div>
          <button className="swap-retry-btn" onClick={() => setSwapState('idle')}>
            Retry
          </button>
        </div>
      )}

      <button className="wallet-disconnect-btn" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  )
}
