import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

export interface PriceTick {
  price: number
  timestamp: string
}

export interface IndicatorSnapshot {
  ema12: number | null
  ema26: number | null
  rsi: number | null
  macd: { macd: number; signal: number; histogram: number } | null
  bollingerBands: { upper: number; middle: number; lower: number; bandwidth: number } | null
  isReady: boolean
}

export interface Signal {
  type: 'BUY' | 'SELL'
  price: number
  indicators: IndicatorSnapshot
  reasons: string[]
  timestamp: string
}

export interface Trade {
  type: 'BUY' | 'SELL'
  price: number
  amount: number
  value: number
  pnl: number
  pnlPercent: number
  balance: number
  timestamp: string
}

export interface Portfolio {
  usdcBalance: number
  avaxAmount: number
  avgEntryPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  totalRealizedPnl: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [prices, setPrices] = useState<PriceTick[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [latestIndicators, setLatestIndicators] = useState<IndicatorSnapshot | null>(null)

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setStatus('connected')
      console.log('[AvaxSignal] Dashboard connected')
    })

    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('reconnect_attempt', () => setStatus('reconnecting'))

    socket.on('initialData', (data: {
      prices: PriceTick[]
      signals: Signal[]
      trades: Trade[]
      portfolio: Portfolio | null
    }) => {
      if (data.prices) setPrices(data.prices)
      if (data.signals) setSignals(data.signals)
      if (data.trades) setTrades(data.trades)
      if (data.portfolio) setPortfolio(data.portfolio)
    })

    socket.on('priceTick', (tick: PriceTick) => {
      setPrices(prev => {
        const next = [...prev, tick]
        return next.length > 500 ? next.slice(-500) : next
      })
    })

    socket.on('signal', (signal: Signal) => {
      setSignals(prev => [signal, ...prev].slice(0, 100))
    })

    socket.on('indicatorUpdate', (indicators: IndicatorSnapshot) => {
      setLatestIndicators(indicators)
    })

    socket.on('trade', (trade: Trade) => {
      setTrades(prev => [trade, ...prev].slice(0, 100))
    })

    socket.on('portfolioUpdate', (p: Portfolio) => {
      setPortfolio(p)
    })

    return () => { socket.disconnect() }
  }, [])

  return { status, prices, signals, trades, portfolio, latestIndicators }
}
