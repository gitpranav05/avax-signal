import React from 'react'
import { useSocket } from './hooks/useSocket'
import { TopBar } from './components/TopBar'
import { PriceChart } from './components/PriceChart'
import { IndicatorPanel } from './components/IndicatorPanel'
import { SignalFeed } from './components/SignalFeed'
import { PortfolioPanel } from './components/Portfolio'
import { WalletPanel } from './components/WalletPanel'

const App: React.FC = () => {
  const { status, prices, signals, portfolio, latestIndicators } = useSocket()
  const currentPrice = prices.length > 0 ? prices[prices.length - 1].price : null

  return (
    <div className="app">
      <TopBar status={status} currentPrice={currentPrice} />
      <div className="main-content">
        <div className="left-panel">
          <PriceChart prices={prices} />
          <IndicatorPanel indicators={latestIndicators} />
        </div>
        <div className="right-panel">
          <WalletPanel />
          <SignalFeed signals={signals} />
        </div>
      </div>
      <PortfolioPanel portfolio={portfolio} />
    </div>
  )
}

export default App
