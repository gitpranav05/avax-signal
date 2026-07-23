import React, { useEffect, useState, useCallback } from 'react'

interface WalletInfo {
  address: string
  balanceAVAX: string
  chainId: number
  network: string
}

interface SwapResult {
  success: boolean
  txHash: string
  snowtraceUrl: string
  amountAVAX: string
  type: 'BUY' | 'SELL'
  error?: string
}

type SwapState = 'idle' | 'loading' | 'success' | 'error'

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export const WalletPanel: React.FC = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [swapState, setSwapState] = useState<SwapState>('idle')
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setWallet(data)
      setWalletError(null)
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Failed to load wallet')
    }
  }, [])

  // Load wallet on mount, refresh every 15s
  useEffect(() => {
    fetchWallet()
    const t = setInterval(fetchWallet, 15_000)
    return () => clearInterval(t)
  }, [fetchWallet])

  const handleSwap = async () => {
    setSwapState('loading')
    setSwapResult(null)
    setSwapError(null)

    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BUY', amountAVAX: '0.01' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Swap failed')
      }
      setSwapResult(data)
      setSwapState('success')
      // Refresh balance after swap
      setTimeout(fetchWallet, 3000)
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : 'Unknown error')
      setSwapState('error')
    }
  }

  return (
    <div className="wallet-panel">
      <div className="wallet-header">
        <span className="wallet-title">Fuji Wallet</span>
        <span className="wallet-network-badge">⛰ TESTNET</span>
      </div>

      {walletError ? (
        <div className="wallet-error">{walletError}</div>
      ) : !wallet ? (
        <div className="wallet-loading">Loading wallet…</div>
      ) : (
        <div className="wallet-info">
          <div className="wallet-row">
            <span className="wallet-label">Address</span>
            <span className="wallet-value wallet-address" title={wallet.address}>
              {truncateAddr(wallet.address)}
            </span>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">Balance</span>
            <span className="wallet-value wallet-balance">
              {parseFloat(wallet.balanceAVAX).toFixed(4)} AVAX
            </span>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">Chain ID</span>
            <span className="wallet-value">{wallet.chainId}</span>
          </div>
        </div>
      )}

      <button
        className={`swap-btn swap-btn--${swapState}`}
        onClick={handleSwap}
        disabled={swapState === 'loading' || !wallet}
      >
        {swapState === 'loading' ? (
          <><span className="swap-spinner" /> Sending TX…</>
        ) : swapState === 'success' ? (
          '✓ TX Confirmed'
        ) : (
          '⚡ Execute Testnet Swap (0.01 AVAX)'
        )}
      </button>

      {swapState === 'success' && swapResult && (
        <div className="swap-result swap-result--success">
          <div className="swap-result-label">Transaction Hash</div>
          <a
            className="swap-tx-link"
            href={swapResult.snowtraceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={swapResult.txHash}
          >
            {truncateAddr(swapResult.txHash)}
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
    </div>
  )
}
