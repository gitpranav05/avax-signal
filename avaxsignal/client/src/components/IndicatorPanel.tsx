import React from 'react'
import { IndicatorSnapshot } from '../hooks/useSocket'

interface Props { indicators: IndicatorSnapshot | null }

export const IndicatorPanel: React.FC<Props> = ({ indicators }) => {
  if (!indicators || !indicators.isReady) {
    return (
      <div className="indicator-panel">
        {['EMA (12/26)', 'RSI (14)', 'MACD', 'Bollinger Bands'].map(n => (
          <div key={n} className="indicator-card">
            <div className="indicator-label">{n}</div>
            <div className="indicator-warming-box">
              <span className="swap-spinner" style={{ width: 12, height: 12 }} />
              <span>Initializing…</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const { ema12, ema26, rsi, macd, bollingerBands } = indicators
  const rsiCls = rsi! < 30 ? 'indicator-value--buy' : rsi! > 70 ? 'indicator-value--sell' : 'indicator-value--neutral'
  const macdCls = macd!.histogram > 0 ? 'indicator-value--buy' : macd!.histogram < 0 ? 'indicator-value--sell' : 'indicator-value--neutral'

  return (
    <div className="indicator-panel">
      <div className="indicator-card">
        <div className="indicator-label">EMA (12/26)</div>
        <div className={`indicator-value ${ema12! > ema26! ? 'indicator-value--buy' : 'indicator-value--sell'}`}>
          {ema12!.toFixed(4)}
        </div>
        <div className="indicator-sub">EMA26: {ema26!.toFixed(4)} {ema12! > ema26! ? '▲ Bullish' : '▼ Bearish'}</div>
      </div>
      <div className="indicator-card">
        <div className="indicator-label">RSI (14)</div>
        <div className={`indicator-value ${rsiCls}`}>{rsi!.toFixed(1)}</div>
        <div className="indicator-sub">{rsi! < 30 ? '⚡ Oversold' : rsi! > 70 ? '🔥 Overbought' : 'Neutral'}</div>
      </div>
      <div className="indicator-card">
        <div className="indicator-label">MACD</div>
        <div className={`indicator-value ${macdCls}`}>{macd!.histogram >= 0 ? '+' : ''}{macd!.histogram.toFixed(4)}</div>
        <div className="indicator-sub">Line: {macd!.macd.toFixed(4)} / Sig: {macd!.signal.toFixed(4)}</div>
      </div>
      <div className="indicator-card">
        <div className="indicator-label">Bollinger Bands</div>
        <div className="indicator-value">{bollingerBands!.middle.toFixed(4)}</div>
        <div className="indicator-sub">{bollingerBands!.lower.toFixed(2)} — {bollingerBands!.upper.toFixed(2)}</div>
      </div>
    </div>
  )
}
