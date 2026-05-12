import { usePoolState } from '../hooks/usePoolState'
import { formatEth } from '../lib/curve'

export function TickerStrip() {
  const pool = usePoolState()

  const treasury = pool.configured ? `${formatEth(pool.treasuryEth, 4)} Ξ` : '— Ξ'
  const debt = pool.configured ? `${formatEth(pool.totalDebt, 4)} Ξ` : '— Ξ'
  const available = pool.configured ? `${formatEth(pool.availableTreasury, 4)} Ξ` : '— Ξ'
  const positions = pool.configured ? String(pool.nextPositionId - 1n) : '—'

  const items = [
    { l: 'RIS3', v: 'on uniswap v4', ch: pool.configured ? 'live' : null },
    { l: 'leverage', v: '2× · 3×', ch: null },
    { l: 'treasury', v: treasury, ch: null },
    { l: 'total debt', v: debt, ch: null },
    { l: 'available', v: available, ch: null },
    { l: 'open positions', v: positions, ch: null },
    { l: 'hook fee', v: '1% ETH', ch: '→ vault' },
    { l: 'liq threshold', v: '1.4×', ch: null },
    { l: 'min position', v: '0.05 Ξ', ch: null },
    { l: 'admin keys', v: 'none', ch: 'immutable' },
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
