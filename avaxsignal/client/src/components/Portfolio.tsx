import React from 'react'
import { Portfolio as PortfolioType } from '../hooks/useSocket'

interface Props { portfolio: PortfolioType | null }

const pnlCls = (v: number) => v > 0 ? 'pnl-positive' : v < 0 ? 'pnl-negative' : 'pnl-zero'
const fmtPnl = (v: number) => `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`

export const PortfolioPanel: React.FC<Props> = ({ portfolio }) => {
  if (!portfolio) {
    return (
      <div className="bottom-panel">
        <div className="portfolio-header"><span className="portfolio-title">Paper Portfolio</span></div>
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

  return (
    <div className="bottom-panel">
      <div className="portfolio-header">
        <span className="portfolio-title">Paper Portfolio</span>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-muted)' }}>{portfolio.totalTrades} trades</span>
      </div>
      <div className="portfolio-grid">
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">USDC Balance</div>
          <div className="portfolio-stat-value">${portfolio.usdcBalance.toFixed(2)}</div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">AVAX Position</div>
          <div className="portfolio-stat-value">
            {portfolio.avaxAmount > 0 ? (
              <>{portfolio.avaxAmount.toFixed(4)}<div className="indicator-sub">@ ${portfolio.avgEntryPrice.toFixed(4)}</div></>
            ) : <span className="pnl-zero">No position</span>}
          </div>
        </div>
        <div className="portfolio-stat">
          <div className="portfolio-stat-label">Unrealized P&L</div>
          <div className={`portfolio-stat-value ${pnlCls(portfolio.unrealizedPnl)}`}>
            {portfolio.avaxAmount > 0 ? (
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
