import { usePoolState } from '../hooks/usePoolState'
import { formatEth } from '../lib/curve'

/**
 * Hero treasury readout — live vault.treasuryEth + totalDebt + position count.
 * Polled via usePoolState (12s interval).
 */
export function TreasuryHero() {
  const pool = usePoolState()
  if (!pool.configured) return null

  const treasury  = formatEth(pool.treasuryEth, 4)
  const available = formatEth(pool.availableTreasury, 4)
  const positions = String(pool.nextPositionId - 1n)

  return (
    <div className="treasury-hero">
      <div className="th-main">
        <span className="th-lab">vault treasury</span>
        <span className="th-val">
          {treasury} <span className="th-unit">Ξ</span>
        </span>
        <span className="th-live" title="updates every 12s">● live</span>
      </div>
      <div className="th-sub">
        <span>{available} Ξ available</span>
        <span className="dot">·</span>
        <span>{positions} {positions === '1' ? 'position' : 'positions'} opened all-time</span>
      </div>
    </div>
  )
}
