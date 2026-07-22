import React, { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, LineSeries, ColorType } from 'lightweight-charts'
import { PriceTick } from '../hooks/useSocket'

interface PriceChartProps {
  prices: PriceTick[]
}

export const PriceChart: React.FC<PriceChartProps> = ({ prices }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
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
        vertLine: { color: '#3A4250', width: 1, style: 3 },
        horzLine: { color: '#3A4250', width: 1, style: 3 },
      },
      rightPriceScale: { borderColor: '#252B33' },
      timeScale: { borderColor: '#252B33', timeVisible: true, secondsVisible: false },
    })

    const series = chart.addSeries(LineSeries, {
      color: '#E84142',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#E84142',
      crosshairMarkerBackgroundColor: '#0B0E11',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        chart.applyOptions({ width, height })
      }
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); chart.remove() }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || prices.length === 0) return

    const data = prices.map(p => ({
      time: Math.floor(new Date(p.timestamp).getTime() / 1000) as any,
      value: p.price,
    }))

    // Deduplicate by time
    const deduped = data.reduce((acc: any[], pt) => {
      if (acc.length === 0 || acc[acc.length - 1].time !== pt.time) acc.push(pt)
      else acc[acc.length - 1] = pt
      return acc
    }, [])

    seriesRef.current.setData(deduped)
    chartRef.current?.timeScale().scrollToRealTime()
  }, [prices])

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">AVAX/USDC — Live Price</span>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100% - 32px)' }} />
    </div>
  )
}
