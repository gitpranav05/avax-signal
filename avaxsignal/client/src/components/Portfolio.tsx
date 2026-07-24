import React, { useState } from 'react'
import { Portfolio as PortfolioType } from '../hooks/useSocket'

interface Props { portfolio: PortfolioType | null }

const pnlCls = (v: number) => v > 0 ? 'pnl-positive' : v < 0 ? 'pnl-negative' : 'pnl-zero'
const fmtPnl = (v: number) => `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`

export const PortfolioPanel: React.FC<Props> = ({ portfolio }) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAction = async (action: 'buy' | 'sell' | 'reset') => {
    setLoadingAction(action)
    try {
      await fetch(`/api/portfolio/${action}`, { method: 'POST' })
    } catch (err) {
      console.error(`Manual ${action} failed:`, err)
    } finally {
      setLoadingAction(null)
    }
  }

  if (!portfolio) {
    return (
      <div className="bottom-panel">
        <div className="portfolio-header">
          <span className="portfolio-title">Paper Portfolio</span>
        </div>
        <div className="portfolio-grid">
          {['USDC Balance', 'AVAX Position', 'Unrealized P&L', 'Realized P&L', 'Win Rate'].map(l => (
            <div key={l} className="portfolio-stat">
              <div className="portfolio-stat-label">{l}</div>
              <div className="portfolio-stat-value pnl-zero">—</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const wr = portfolio.totalTrades > 0 ? ((portfolio.winningTrades / portfolio.totalTrades) * 100).toFixed(0) : '—'
  const hasPosition = portfolio.avaxAmount > 0

  return (
    <div className="bottom-panel">
      <div className="portfolio-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="portfolio-title">Paper Portfolio</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-muted)' }}>
            {portfolio.totalTrades} trades
          </span>
        </div>

        <div className="portfolio-actions">
          <button
            className="portfolio-btn portfolio-btn--buy"
            onClick={() => handleAction('buy')}
            disabled={hasPosition || loadingAction !== null}
            title={hasPosition ? 'Already holding a position' : 'Execute manual paper BUY trade (25% balance)'}
          >
            🟢 Manual BUY
          </button>
          <button
            className="portfolio-btn portfolio-btn--sell"
            onClick={() => handleAction('sell')}
            disabled={!hasPosition || loadingAction !== null}
            title={!hasPosition ? 'No position to sell' : 'Execute manual paper SELL trade'}
          >
            🔴 Manual SELL
          </button>
          <button
            className="portfolio-btn portfolio-btn--reset"
            onClick={() => handleAction('reset')}
            disabled={loadingAction !== null}
            title="Reset paper portfolio to initial $10,000 USDC balance"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="portfolio-grid">
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">USDC Balance</div>
          <div className="portfolio-stat-value">${portfolio.usdcBalance.toFixed(2)}</div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">AVAX Position</div>
          <div className="portfolio-stat-value">
            {hasPosition ? (
              <>{portfolio.avaxAmount.toFixed(4)}<div className="indicator-sub">@ ${portfolio.avgEntryPrice.toFixed(4)}</div></>
            ) : <span className="pnl-zero">No position</span>}
          </div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">Unrealized P&L</div>
          <div className={`portfolio-stat-value ${pnlCls(portfolio.unrealizedPnl)}`}>
            {hasPosition ? (
              <>{fmtPnl(portfolio.unrealizedPnl)}<div className="indicator-sub">{portfolio.unrealizedPnlPercent >= 0 ? '+' : ''}{portfolio.unrealizedPnlPercent.toFixed(2)}%</div></>
            ) : <span className="pnl-zero">—</span>}
          </div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">Realized P&L</div>
          <div className={`portfolio-stat-value ${pnlCls(portfolio.totalRealizedPnl)}`}>{fmtPnl(portfolio.totalRealizedPnl)}</div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">Win Rate</div>
          <div className="portfolio-stat-value">
            {wr}{wr !== '—' ? '%' : ''}
            {portfolio.totalTrades > 0 && <div className="indicator-sub">{portfolio.winningTrades}W / {portfolio.losingTrades}L</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
