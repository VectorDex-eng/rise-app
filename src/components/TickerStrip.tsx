import { usePoolState } from '../hooks/usePoolState'
import { formatEth, formatSpotGwei } from '../lib/curve'

export function TickerStrip() {
  const pool = usePoolState()

  // Build ticker items from live state, with sensible fallbacks
  const spotStr = pool.configured ? `${formatSpotGwei(pool.spot)} gwei` : '— gwei'
  const realEth = pool.configured ? `${formatEth(pool.realETH, 4)} Ξ` : '— Ξ'
  const debt = pool.configured ? `${formatEth(pool.totalDebt, 4)} Ξ` : '— Ξ'
  const headroom = pool.configured ? `${formatEth(pool.debtHeadroom, 2)} Ξ` : '— Ξ'
  const positions = pool.configured ? String(pool.nextPositionId) : '—'

  const items = [
    { l: 'RIS3', v: spotStr, ch: pool.configured ? 'live' : null },
    { l: 'realETH', v: realEth, ch: null },
    { l: 'totalDebt', v: debt, ch: null },
    { l: 'positions', v: positions, ch: null },
    { l: 'headroom', v: headroom, ch: null },
    { l: 'tests', v: '60/60', ch: 'passing' },
    { l: 'fuzz runs', v: '3,000', ch: null },
    { l: 'audit', v: 'no critical', ch: 'clean' },
    { l: 'K drift', v: 'bounty only', ch: null },
  ]

  return (
    <div className="ticker-strip">
      <div className="ticker-track">
        {[...items, ...items].map((it, i) => (
          <span className="item" key={i}>
            <span>{it.l}</span>
            <span className="v">{it.v}</span>
            {it.ch && <span className="ch">{it.ch}</span>}
            {i < items.length * 2 - 1 && <span className="sep">·</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
