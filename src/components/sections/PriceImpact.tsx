import { useMemo } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { SectHead } from './SectHead'
import { V_ETH, TOTAL_SUPPLY } from '../../lib/config'

const ETH_USD_ILLUSTRATIVE = 3500

export function PriceImpact() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const V = Number(V_ETH) / 1e18
  const S = Number(TOTAL_SUPPLY) / 1e18
  const Sm = S / 1e6
  const PCT_MAX = 0.95
  const E_MAX = V * (PCT_MAX / (1 - PCT_MAX))
  const maxSpotEth = ((V + E_MAX) ** 2) / (V * S)
  const maxSpotUsd = maxSpotEth * ETH_USD_ILLUSTRATIVE
  const X0 = 56, Y0 = 24, W = 588, H = 256
  const xAt = (eth: number) => X0 + (W * eth) / E_MAX
  const yL = (supply: number) => Y0 + H - (supply / S) * H
  const yR = (priceUsd: number) => Y0 + H - (priceUsd / maxSpotUsd) * H
  const supplyAt = (eth: number) => S * (eth / (V + eth))
  const spotUsdAt = (eth: number) => (((V + eth) ** 2) / (V * S)) * ETH_USD_ILLUSTRATIVE

  const { supplyPath, supplyArea, pricePath } = useMemo(() => {
    const N = 200
    let sp = '', sa = 'M ' + xAt(0).toFixed(2) + ' ' + (Y0 + H).toFixed(2) + ' '
    let pp = ''
    for (let i = 0; i <= N; i++) {
      const eth = (E_MAX * i) / N
      const xx = xAt(eth)
      sp += (i ? 'L' : 'M') + xx.toFixed(2) + ' ' + yL(supplyAt(eth)).toFixed(2) + ' '
      sa += 'L ' + xx.toFixed(2) + ' ' + yL(supplyAt(eth)).toFixed(2) + ' '
      pp += (i ? 'L' : 'M') + xx.toFixed(2) + ' ' + yR(spotUsdAt(eth)).toFixed(2) + ' '
    }
    sa += 'L ' + xAt(E_MAX).toFixed(2) + ' ' + (Y0 + H).toFixed(2) + ' Z'
    return { supplyPath: sp, supplyArea: sa, pricePath: pp }
  }, [E_MAX, S, V])

  const xTicks = [0, E_MAX * 0.25, E_MAX * 0.5, E_MAX * 0.75, E_MAX]
  const yLTicks = [0, S * 0.25, S * 0.5, S * 0.75, S]
  const yRTicks = [0, maxSpotUsd * 0.25, maxSpotUsd * 0.5, maxSpotUsd * 0.75, maxSpotUsd]
  const milestoneEth = V * 9
  const milestoneSupply = supplyAt(milestoneEth)
  const milestonePrice = spotUsdAt(milestoneEth)

  const fmtSupply = (s: number) => {
    if (s === 0) return '0'
    if (s >= 1e6) return `${(s / 1e6).toFixed(s % 1e6 === 0 ? 0 : 2)}M`
    if (s >= 1e3) return `${(s / 1e3).toFixed(0)}K`
    return s.toFixed(0)
  }
  const fmtPrice = (p: number) => {
    if (p === 0) return '$0'
    if (p < 0.01) return `$${p.toFixed(4)}`
    if (p < 1) return `$${p.toFixed(3)}`
    if (p < 100) return `$${p.toFixed(2)}`
    return `$${p.toFixed(0)}`
  }
  const fmtEth = (e: number) => e === 0 ? '0' : e < 100 ? e.toFixed(0) : String(Math.round(e / 10) * 10)

  const stats = [
    { lab: '50% supply', v: `${V} Ξ`, sub: 'price ~4× start' },
    { lab: '90% supply', v: `${V * 9} Ξ`, sub: 'price ~100× start' },
    { lab: '99% supply', v: `${V * 99} Ξ`, sub: 'price ~10,000× start' },
    { lab: 'asymptote', v: '∞', sub: 'never reached' },
  ]

  return (
    <section data-num="04">
      <div className="shell">
        <SectHead num="04" label="supply distribution" numLabel="04">
          <em>Constant-product curve.</em> <span className="acc">Supply approaches {Sm}M, never reaches it.</span> Price grows hyperbolically with cumulative ETH.
          <div className="sect-sub">
            E = cumulative ETH on the curve. Supply minted = S × E/(V+E). Spot price = (V+E)²/(V·S). The first half of supply mints in V ETH and quadruples the price; the last 9% costs ~10× more ETH again and runs price ~100× higher than that.
          </div>
        </SectHead>

        <div className="sect-body">
          <div ref={ref} className={`viz-card ${revealed ? 'revealed' : ''}`} style={{ maxWidth: '100%' }}>
            <div className="viz-head" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 18, marginBottom: 24 }}>
              <div className="viz-ttl">
                curve
                <span style={{ color: 'var(--grn)', marginLeft: 18, fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: 11 }}>— supply</span>
                <span style={{ color: 'var(--acc)', marginLeft: 14, fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: 11 }}>— price</span>
              </div>
              <div className="viz-legend">
                <span className="item" style={{ fontSize: 10, letterSpacing: '0.1em' }}>illustrative · ETH = ${ETH_USD_ILLUSTRATIVE.toLocaleString()} · V = {V} Ξ</span>
              </div>
            </div>

            <svg className="viz-svg" viewBox="0 0 700 320" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="grn-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d39c" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#34d39c" stopOpacity="0" />
                </linearGradient>
                <pattern id="grid-pat" width="35" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 35 0 L 0 0 0 50" fill="none" stroke="#1d1d22" strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect x={X0} y={Y0} width={W} height={H} fill="url(#grid-pat)" />
              <line x1={X0} y1={Y0} x2={X0} y2={Y0 + H} stroke="#2f2f37" strokeWidth="0.5" />
              <line x1={X0} y1={Y0 + H} x2={X0 + W} y2={Y0 + H} stroke="#2f2f37" strokeWidth="0.5" />
              <line x1={X0 + W} y1={Y0} x2={X0 + W} y2={Y0 + H} stroke="#2f2f37" strokeWidth="0.5" />
              <line x1={X0} y1={Y0} x2={X0 + W} y2={Y0} stroke="#424249" strokeWidth="0.5" strokeDasharray="3 3" />
              {yLTicks.map((s, i) => (
                <text key={`yl-${i}`} x={X0 - 8} y={yL(s) + 4} textAnchor="end" fill="#34d39c" fontSize="10" fontFamily="JetBrains Mono" fontWeight={i === 0 || i === yLTicks.length - 1 ? 500 : 400}>{fmtSupply(s)}</text>
              ))}
              {yRTicks.slice(1).map((p, i) => (
                <text key={`yr-${i}`} x={X0 + W + 8} y={yR(p) + 4} textAnchor="start" fill="#ff5a2b" fontSize="10" fontFamily="JetBrains Mono" fontWeight={i === yRTicks.length - 2 ? 500 : 400}>{fmtPrice(p)}</text>
              ))}
              <text x={X0 + W + 8} y={Y0 + H + 4} textAnchor="start" fill="#ff5a2b" fontSize="10" fontFamily="JetBrains Mono" fontWeight="500">$0</text>
              {xTicks.map((e, i) => (
                <text key={`xt-${i}`} x={xAt(e)} y={Y0 + H + 18} textAnchor="middle" fill="#76767e" fontSize="10" fontFamily="JetBrains Mono">{fmtEth(e)}</text>
              ))}
              <text x={X0 + W / 2} y={Y0 + H + 36} textAnchor="middle" fill="#444449" fontSize="10" fontFamily="Fraunces" fontStyle="italic">cumulative ETH on curve</text>
              <line x1={xAt(milestoneEth)} y1={Y0} x2={xAt(milestoneEth)} y2={Y0 + H} stroke="#303038" strokeWidth="0.5" strokeDasharray="2 3" />
              <circle cx={xAt(milestoneEth)} cy={yL(milestoneSupply)} r="3.5" fill="#34d39c" stroke="#0a0a0b" strokeWidth="1.5" />
              <circle cx={xAt(milestoneEth)} cy={yR(milestonePrice)} r="3.5" fill="#ff5a2b" stroke="#0a0a0b" strokeWidth="1.5" />
              <path fill="url(#grn-fade)" d={supplyArea} />
              <path fill="none" stroke="#34d39c" strokeWidth="2" d={supplyPath} />
              <path fill="none" stroke="#ff5a2b" strokeWidth="2" d={pricePath} />
            </svg>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--acc)', paddingLeft: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>{s.lab}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', fontFamily: 'var(--mono)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}