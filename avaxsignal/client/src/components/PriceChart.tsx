/**
 * PriceChart.tsx — CEX/DEX chart toggle
 *
 * CEX Mode: Live line chart from Chainlink 2s ticks (existing behavior)
 * DEX Mode: Candlestick chart with OHLCV from GeckoTerminal API (free, no key)
 *           + timeframe selector: 1m / 5m / 15m / 1h
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart, IChartApi, ISeriesApi,
  LineSeries, CandlestickSeries, ColorType,
} from 'lightweight-charts'
import { PriceTick } from '../hooks/useSocket'

// ─── Types ───────────────────────────────────────────────────────────

type ChartMode = 'cex' | 'dex'
type Timeframe = '1m' | '5m' | '15m' | '1h'

interface OHLCVBar {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface PriceChartProps {
  prices: PriceTick[]
}

// ─── GeckoTerminal helpers ────────────────────────────────────────────

const GT_BASE = 'https://api.geckoterminal.com/api/v2'
const GT_HEADERS = { Accept: 'application/json;version=20230302' }

// WAVAX on Avalanche mainnet
const WAVAX = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'

let cachedPool: string | null = null

async function getTopPool(): Promise<string> {
  if (cachedPool) return cachedPool
  const res = await fetch(`${GT_BASE}/networks/avax/tokens/${WAVAX}/pools?page=1`, {
    headers: GT_HEADERS,
  })
  if (!res.ok) throw new Error('GeckoTerminal pool lookup failed')
  const json = await res.json()
  // id is like "avax_0xABC..."  strip the prefix
  const poolId: string = json.data[0].id
  cachedPool = poolId.includes('_') ? poolId.split('_')[1] : poolId
  return cachedPool
}

async function fetchOHLCV(poolAddress: string, timeframe: Timeframe): Promise<OHLCVBar[]> {
  const gtTimeframe = timeframe === '1h' ? 'hour' : 'minute'
  const aggregate = timeframe === '1h' ? 1 : parseInt(timeframe)

  const res = await fetch(
    `${GT_BASE}/networks/avax/pools/${poolAddress}/ohlcv/${gtTimeframe}?aggregate=${aggregate}&limit=200&currency=usd`,
    { headers: GT_HEADERS },
  )
  if (!res.ok) throw new Error('GeckoTerminal OHLCV fetch failed')
  const json = await res.json()

  // ohlcv_list: [[timestamp_ms, open, high, low, close, volume], ...]
  const raw: number[][] = json.data.attributes.ohlcv_list
  return raw
    .map(([ts, o, h, l, c]) => ({
      time: Math.floor(ts / 1000),
      open: o, high: h, low: l, close: c,
    }))
    .sort((a, b) => a.time - b.time)
}

// ─── Chart constants ──────────────────────────────────────────────────

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: '#0B0E11' },
    textColor: '#8B93A1',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: '#1C2230' },
    horzLines: { color: '#1C2230' },
  },
  crosshair: {
    vertLine: { color: '#3A4250', width: 1 as const, style: 3 },
    horzLine: { color: '#3A4250', width: 1 as const, style: 3 },
  },
  rightPriceScale: { borderColor: '#252B33' },
  timeScale: { borderColor: '#252B33', timeVisible: true, secondsVisible: false },
}

// ─── Component ────────────────────────────────────────────────────────

export const PriceChart: React.FC<PriceChartProps> = ({ prices }) => {
  const containerRef   = useRef<HTMLDivElement>(null)
  const chartRef       = useRef<IChartApi | null>(null)
  const lineRef        = useRef<ISeriesApi<'Line'> | null>(null)
  const candleRef      = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const [mode, setMode]           = useState<ChartMode>('cex')
  const [timeframe, setTimeframe] = useState<Timeframe>('5m')
  const [isLoading, setIsLoading] = useState(false)
  const [dexError, setDexError]   = useState<string | null>(null)

  // ── Create chart once ─────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, CHART_OPTIONS)

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#E84142',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#E84142',
      crosshairMarkerBackgroundColor: '#0B0E11',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#2ECC71',
      downColor: '#E84142',
      borderVisible: false,
      wickUpColor: '#2ECC71',
      wickDownColor: '#E84142',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
      visible: false, // hidden initially — CEX mode is default
    })

    chartRef.current  = chart
    lineRef.current   = lineSeries
    candleRef.current = candleSeries

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height })
      }
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); chart.remove() }
  }, [])

  // ── Toggle series visibility on mode change ───────────────────────

  useEffect(() => {
    lineRef.current?.applyOptions({ visible: mode === 'cex' })
    candleRef.current?.applyOptions({ visible: mode === 'dex' })
  }, [mode])

  // ── CEX: update live line chart ───────────────────────────────────

  useEffect(() => {
    if (mode !== 'cex' || !lineRef.current || prices.length === 0) return

    const data = prices.map(p => ({
      time: Math.floor(new Date(p.timestamp).getTime() / 1000) as any,
      value: p.price,
    }))

    // Deduplicate by timestamp
    const deduped = data.reduce((acc: any[], pt) => {
      if (!acc.length || acc[acc.length - 1].time !== pt.time) acc.push(pt)
      else acc[acc.length - 1] = pt
      return acc
    }, [])

    lineRef.current.setData(deduped)
    chartRef.current?.timeScale().scrollToRealTime()
  }, [prices, mode])

  // ── DEX: fetch OHLCV from GeckoTerminal ───────────────────────────

  const loadDEXData = useCallback(async () => {
    if (!candleRef.current) return
    setIsLoading(true)
    setDexError(null)
    try {
      const pool = await getTopPool()
      const bars = await fetchOHLCV(pool, timeframe)
      candleRef.current.setData(bars as any)
      chartRef.current?.timeScale().fitContent()
    } catch (err: any) {
      setDexError('Could not load DEX candles — ' + (err.message ?? 'unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    if (mode === 'dex') loadDEXData()
  }, [mode, timeframe, loadDEXData])

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">AVAX/USDC — LIVE PRICE</span>

        <div className="chart-controls">
          {/* Timeframe selector — only in DEX mode */}
          {mode === 'dex' && (
            <div className="chart-timeframes">
              {(['1m', '5m', '15m', '1h'] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  className={`chart-tf-btn${timeframe === tf ? ' chart-tf-btn--active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {/* CEX / DEX mode toggle */}
          <div className="chart-mode-toggle">
            <button
              className={`chart-mode-btn${mode === 'cex' ? ' chart-mode-btn--active' : ''}`}
              onClick={() => setMode('cex')}
              title="Line chart — live Chainlink price feed"
            >
              CEX
            </button>
            <button
              className={`chart-mode-btn${mode === 'dex' ? ' chart-mode-btn--active' : ''}`}
              onClick={() => setMode('dex')}
              title="Candlestick chart — DEX OHLCV from GeckoTerminal"
            >
              DEX
            </button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="chart-overlay">
          <span className="swap-spinner" style={{ width: 14, height: 14 }} />
          &nbsp;Loading candles…
        </div>
      )}

      {/* Error overlay */}
      {dexError && !isLoading && (
        <div className="chart-overlay chart-overlay--error">
          ⚠ {dexError}
          <button className="chart-overlay-retry" onClick={loadDEXData}>Retry</button>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ width: '100%', height: 'calc(100% - 40px)' }}
      />
    </div>
  )
}
