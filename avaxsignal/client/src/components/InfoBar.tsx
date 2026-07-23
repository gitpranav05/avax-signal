import React, { useState } from 'react'

interface Props {
  onClose: () => void
}

export const HowItWorksModal: React.FC<Props> = ({ onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <span className="modal-title">How AvaxSignal Works</span>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="modal-steps">
        <div className="modal-step">
          <div className="modal-step-num">1</div>
          <div>
            <div className="modal-step-title">Live Price Feed</div>
            <div className="modal-step-desc">Reads AVAX/USD every 2 seconds from the <strong>Chainlink oracle</strong> on Avalanche mainnet. No CEX APIs — pure on-chain data.</div>
          </div>
        </div>
        <div className="modal-step">
          <div className="modal-step-num">2</div>
          <div>
            <div className="modal-step-title">Technical Indicators</div>
            <div className="modal-step-desc"><strong>EMA, RSI, MACD, Bollinger Bands</strong> — calculated in real-time on every price tick. When RSI &lt; 30, price is oversold (potential BUY). When RSI &gt; 70, overbought (potential SELL).</div>
          </div>
        </div>
        <div className="modal-step">
          <div className="modal-step-num">3</div>
          <div>
            <div className="modal-step-title">Signal Engine</div>
            <div className="modal-step-desc">Multi-indicator confirmation: RSI + Bollinger Bands must agree before a BUY/SELL signal fires. Reduces false positives.</div>
          </div>
        </div>
        <div className="modal-step">
          <div className="modal-step-num">4</div>
          <div>
            <div className="modal-step-title">Paper Portfolio</div>
            <div className="modal-step-desc">Simulates trades based on signals starting with <strong>$10,000 USDC</strong>. No real funds — this shows whether the signals would have been profitable.</div>
          </div>
        </div>
        <div className="modal-step">
          <div className="modal-step-num">5</div>
          <div>
            <div className="modal-step-title">Testnet Execution (Fuji)</div>
            <div className="modal-step-desc">The "Execute Swap" button sends a <strong>real transaction on Fuji testnet</strong> — proving the execution layer works on Avalanche. Uses a pre-funded testnet wallet (not your funds).</div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <span className="modal-note">⚠ Paper portfolio uses simulated USDC. Testnet wallet uses Fuji AVAX (no real value).</span>
      </div>
    </div>
  </div>
)

export const InfoBar: React.FC = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="info-bar">
        <div className="info-bar-items">
          <span className="info-pill info-pill--paper">📋 Paper Trading — Simulated $10k portfolio</span>
          <span className="info-pill info-pill--chain">⛓ Price: Chainlink AVAX/USD (mainnet, read-only)</span>
          <span className="info-pill info-pill--testnet">🔐 Execution: Fuji testnet only — no real funds</span>
        </div>
        <button className="info-how-btn" onClick={() => setOpen(true)}>
          ? How it works
        </button>
      </div>
      {open && <HowItWorksModal onClose={() => setOpen(false)} />}
    </>
  )
}
