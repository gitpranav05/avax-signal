import React from 'react'
import { ConnectionStatus } from '../hooks/useSocket'

interface TopBarProps {
  status: ConnectionStatus
  currentPrice: number | null
}

export const TopBar: React.FC<TopBarProps> = ({ status, currentPrice }) => {
  const cfg = {
    connected: { label: 'LIVE', cls: 'status-badge--connected' },
    reconnecting: { label: 'RECONNECTING', cls: 'status-badge--reconnecting' },
    disconnected: { label: 'DISCONNECTED', cls: 'status-badge--disconnected' },
  }
  const { label, cls } = cfg[status]

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">Avax<span>Signal</span></div>
        {currentPrice !== null && (
          <div className="topbar-price">
            ${currentPrice.toFixed(4)}
            <span className="topbar-pair">AVAX/USDC</span>
          </div>
        )}
      </div>
      <div className="topbar-right">
        <div className={`status-badge ${cls}`}>
          <span className="status-dot" />
          {label}
        </div>
        <div className="network-badge">⛰ FUJI TESTNET</div>
      </div>
    </header>
  )
}
