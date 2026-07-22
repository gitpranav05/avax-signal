import React from 'react'
import { Signal } from '../hooks/useSocket'

interface Props { signals: Signal[] }

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export const SignalFeed: React.FC<Props> = ({ signals }) => (
  <div className="signal-feed">
    <div className="signal-feed-header">Signal Feed ({signals.length})</div>
    {signals.length === 0 ? (
      <div className="signal-empty">
        <p>No signals yet</p>
        <p style={{ marginTop: 8, fontSize: 11 }}>Waiting for indicators to warm up (~6 min)</p>
      </div>
    ) : (
      signals.map((s, i) => (
        <div key={`${s.timestamp}-${i}`} className={`signal-item signal-item--${s.type.toLowerCase()}`}>
          <span className={`signal-type signal-type--${s.type.toLowerCase()}`}>{s.type}</span>
          <div className="signal-details">
            <div className="signal-price">${s.price.toFixed(4)}</div>
            <div className="signal-reason" title={s.reasons[0]}>{s.reasons[0]}</div>
          </div>
          <span className="signal-time">{formatTime(s.timestamp)}</span>
        </div>
      ))
    )}
  </div>
)
