import { useMemo, useState, useRef, useCallback } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { SectHead } from './SectHead'
import { V_ETH, TOTAL_SUPPLY, DEFAULT_CHAIN_ID } from '../../lib/config'
import { usePoolState } from '../../hooks/usePoolState'

/**
 * Bonding-curve visualization (sat0-inspired, rise-native).
 *
 * Math (constant-product, re-expressed for plotting):
 *   T (tokens minted) = S · E / (V + E)         where E = cumulative ETH
 *   spot(E)           = (V + E)² / (V · S)      ETH per RISE
 *
 * Plot: X = cumulative ETH (linear). Y = price in USD (linear). One green
 * hockey-stick. Hover anywhere to see the per-point detail. Live "YOU ARE
 * HERE" dot tracks the on-chain pool state.
 */

const ETH_USD = 3500

export function PriceImpact() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const pool = usePoolState(DEFAULT_CHAIN_ID)

  // ── constants (human units) ──
  const V = Number(V_ETH) / 1e18
  const S = Number(TOTAL_SUPPLY) / 1e18

  // Visible range: 0 → ~83% supply (E = 5V = 100Ξ). Past this the price
  // explodes vertically — by that point everyone's already rich.
  const E_VIS = 5 * V  // 100Ξ
  const T_VIS = S * E_VIS / (V + E_VIS) // = ~833k RISE
  const priceEth = (E: number) => Math.pow(V + E, 2) / (V * S)
  const supplyAt = (E: number) => (S * E) / (V + E)

  // ── SVG canvas ──
  const W = 800, H = 380
  const PAD_L = 84, PAD_R = 24, PAD_T = 30, PAD_B = 50
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  // axis scales (linear both)
  const PRICE_MAX_VIS = priceEth(E_VIS) * ETH_USD
  const xAt = (E: number) => PAD_L + (E / E_VIS) * plotW
  const yAt = (priceUsd: number) => PAD_T + plotH - (priceUsd / PRICE_MAX_VIS) * plotH

  // ── live state ──
  const live = useMemo(() => {
    const curveTokensN = Number(pool.curveTokens) / 1e18
    if (curveTokensN <= 0) return null
    const minted = S - curveTokensN
    // Invert T = S·E/(V+E) → E = T·V/(S−T)
    const E = (minted * V) / Math.max(S - minted, 1e-9)
    const priceEthNow = Number(pool.spot) / 1e18
    const priceUsdNow = priceEthNow * ETH_USD
    return {
      E,
      minted,
      mintedPct: (minted / S) * 100,
      priceEth: priceEthNow,
      priceUsd: priceUsdNow,
      multStart: priceEthNow / priceEth(0),
      fdvEth: priceEthNow * S,
      fdvUsd: priceEthNow * S * ETH_USD,
    }
  }, [pool.curveTokens, pool.spot, S, V])

  // ── curve path ──
  const curvePath = useMemo(() => {
    const N = 240
    let d = ''
    for (let i = 0; i <= N; i++) {
      const E = (E_VIS * i) / N
      const x = xAt(E).toFixed(2)
      const y = yAt(priceEth(E) * ETH_USD).toFixed(2)
      d += (i ? ' L' : 'M') + x + ' ' + y
    }
    return d
  }, [E_VIS])

  const areaPath = useMemo(() => {
    return curvePath + ` L ${xAt(E_VIS).toFixed(2)} ${PAD_T + plotH} L ${PAD_L} ${PAD_T + plotH} Z`
  }, [curvePath, E_VIS, plotH])

  // ── ticks ──
  const xTicks = [0, 5, 10, 20, 50, 100]
  const yTicks = useMemo(() => {
    // 5 nice ticks across the visible range
    const max = PRICE_MAX_VIS
    const step = niceStep(max / 4)
    const arr: number[] = []
    for (let v = 0; v <= max + step / 2; v += step) arr.push(v)
    return arr
  }, [PRICE_MAX_VIS])

  // ── hover state ──
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; E: number } | null>(null)
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    if (px < PAD_L || px > PAD_L + plotW) { setHover(null); return }
    const E = ((px - PAD_L) / plotW) * E_VIS
    setHover({ x: px, E })
  }, [E_VIS, plotW])
  const onLeave = () => setHover(null)

  const hoverInfo = useMemo(() => {
    if (!hover) return null
    const E = hover.E
    const pEth = priceEth(E)
    const pUsd = pEth * ETH_USD
    const minted = supplyAt(E)
    return {
      E,
      pUsd,
      pEth,
      minted,
      mintedPct: (minted / S) * 100,
      mult: pEth / priceEth(0),
      fdvEth: pEth * S,
      fdvUsd: pUsd * S,
    }
  }, [hover, S, V])

  return (
    <section data-num="04">
      <div className="shell">
        <SectHead num="04" label="bonding curve" numLabel="04">
          <em>One line. </em><span className="acc">Every RIS3 has a deterministic price set by how much ETH has already entered the curve.</span> Buy moves you right. Sell moves you back.
          <div className="sect-sub">
            Hover anywhere to see the per-point price, supply minted, and FDV. The green dot is the live on-chain state — it moves as people trade.
          </div>
        </SectHead>

        <div className="sect-body">
          <div ref={ref} className={`curve-card ${revealed ? 'revealed' : ''}`}>
            <div className="curve-head">
              <div className="curve-ttl">RIS3 · BONDING CURVE</div>
              <div className="curve-now">
                {live ? (
                  <>
                    <span className="kk">NOW</span>
                    <span className="vv">{fmtUsd(live.priceUsd)}</span>
                    <span className="div">·</span>
                    <span className="vv">{live.mintedPct.toFixed(3)}% MINTED</span>
                    <span className="div">·</span>
                    <span className="vv">FDV {fmtUsd(live.fdvUsd)}</span>
                  </>
                ) : (
                  <span className="kk">loading on-chain state…</span>
                )}
              </div>
            </div>

            <svg
              ref={svgRef}
              className="curve-svg"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              role="img"
              aria-label="Bonding curve: token price as a function of cumulative ETH"
            >
              <defs>
                <pattern id="hatch-curve" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#34d399" strokeWidth="0.5" opacity="0.08" />
                </pattern>
              </defs>

              {/* plot frame */}
              <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH}
                    fill="none" stroke="#2f2f2f" strokeWidth="1" />

              {/* y grid + labels (USD) */}
              {yTicks.map((p, i) => {
                if (p > PRICE_MAX_VIS * 1.01) return null
                return (
                  <g key={`y-${i}`}>
                    <line x1={PAD_L} y1={yAt(p)} x2={PAD_L + plotW} y2={yAt(p)}
                          stroke="#161616" strokeWidth="0.5" strokeDasharray="2 4" />
                    <text x={PAD_L - 10} y={yAt(p) + 3.5} textAnchor="end"
                          fill="#888" fontSize="10" fontFamily="JetBrains Mono">
                      {fmtUsd(p)}
                    </text>
                  </g>
                )
              })}

              {/* x grid + labels (ETH) */}
              {xTicks.map((E, i) => {
                if (E > E_VIS) return null
                return (
                  <g key={`x-${i}`}>
                    <line x1={xAt(E)} y1={PAD_T} x2={xAt(E)} y2={PAD_T + plotH}
                          stroke="#161616" strokeWidth="0.5" strokeDasharray="2 4" />
                    <text x={xAt(E)} y={PAD_T + plotH + 16} textAnchor="middle"
                          fill="#888" fontSize="10" fontFamily="JetBrains Mono">
                      {E === 0 ? '0' : `${E}Ξ`}
                    </text>
                  </g>
                )
              })}

              {/* axis labels */}
              <text x={PAD_L} y={PAD_T - 14} textAnchor="start"
                    fill="#666" fontSize="9" fontFamily="JetBrains Mono"
                    letterSpacing="0.16em">
                PRICE
              </text>
              <text x={PAD_L + plotW / 2} y={H - 14} textAnchor="middle"
                    fill="#666" fontSize="9" fontFamily="JetBrains Mono"
                    letterSpacing="0.16em">
                CUMULATIVE ETH INTO CURVE
              </text>

              {/* area under curve */}
              <path d={areaPath} fill="url(#hatch-curve)" />

              {/* the curve */}
              <path d={curvePath} fill="none"
                    stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />

              {/* hover crosshair + tooltip */}
              {hoverInfo && (
                <g pointerEvents="none">
                  <line x1={xAt(hoverInfo.E)} y1={PAD_T}
                        x2={xAt(hoverInfo.E)} y2={PAD_T + plotH}
                        stroke="#fbbf24" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.7" />
                  <line x1={PAD_L} y1={yAt(hoverInfo.pUsd)}
                        x2={PAD_L + plotW} y2={yAt(hoverInfo.pUsd)}
                        stroke="#fbbf24" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.5" />
                  <circle cx={xAt(hoverInfo.E)} cy={yAt(hoverInfo.pUsd)} r="3.5"
                          fill="#fbbf24" stroke="#000" strokeWidth="1" />
                </g>
              )}

              {/* live "YOU ARE HERE" — pulsing green dot */}
              {live && live.E < E_VIS && (
                <g pointerEvents="none">
                  <circle cx={xAt(live.E)} cy={yAt(live.priceUsd)} r="9"
                          fill="none" stroke="#34d399" strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" values="5;16;5" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={xAt(live.E)} cy={yAt(live.priceUsd)} r="5"
                          fill="#34d399" stroke="#000" strokeWidth="1.5" />
                </g>
              )}
            </svg>

            {/* hover tooltip (rendered outside SVG for crisp text) */}
            {hoverInfo && (
              <div
                className="curve-tip"
                style={{ left: `calc(${(xAt(hoverInfo.E) / W) * 100}% + 8px)` }}
              >
                <div className="ct-row"><span>ETH in</span><span>{hoverInfo.E.toFixed(2)}Ξ</span></div>
                <div className="ct-row"><span>price</span><span>{fmtUsd(hoverInfo.pUsd)}</span></div>
                <div className="ct-row"><span>supply</span><span>{hoverInfo.mintedPct.toFixed(2)}%</span></div>
                <div className="ct-row"><span>FDV</span><span>{fmtUsd(hoverInfo.fdvUsd)}</span></div>
                <div className="ct-row mult"><span>× start</span><span>{fmtMult(hoverInfo.mult)}</span></div>
              </div>
            )}

            {/* milestone strip — compact */}
            <div className="curve-stones">
              {[
                { lab: '25%',  E: V * 25 / 75 },
                { lab: '50%',  E: V },
                { lab: '75%',  E: V * 3 },
                { lab: '90%',  E: V * 9 },
                { lab: '99%',  E: V * 99 },
              ].map(m => {
                const pUsd = priceEth(m.E) * ETH_USD
                const mult = priceEth(m.E) / priceEth(0)
                return (
                  <div className="cs-cell" key={m.lab}>
                    <div className="cs-pct">{m.lab}</div>
                    <div className="cs-eth">{fmtEth(m.E)}Ξ in</div>
                    <div className="cs-px">{fmtUsd(pUsd)}</div>
                    <div className="cs-mult">{fmtMult(mult)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// formatters
// ─────────────────────────────────────────────
function fmtUsd(u: number): string {
  if (!isFinite(u) || u <= 0) return '$0'
  if (u < 1e-4) return `$${u.toExponential(2)}`
  if (u < 0.01) return `$${u.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}`
  if (u < 1)    return `$${u.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`
  if (u < 1e3)  return `$${u.toFixed(2)}`
  if (u < 1e6)  return `$${(u / 1e3).toFixed(1)}k`
  if (u < 1e9)  return `$${(u / 1e6).toFixed(2)}M`
  return `$${(u / 1e9).toFixed(2)}B`
}
function fmtEth(e: number): string {
  if (e === 0) return '0'
  if (e < 1)    return e.toFixed(2)
  if (e < 1e3)  return e.toFixed(0)
  return `${(e / 1e3).toFixed(1)}k`
}
function fmtMult(m: number): string {
  if (!isFinite(m) || m <= 0) return '—'
  if (m < 10)    return `${m.toFixed(2)}×`
  if (m < 1e3)   return `${m.toFixed(0)}×`
  if (m < 1e4)   return `${(m / 1e3).toFixed(1)}k×`
  return `${(m / 1e3).toFixed(0)}k×`
}
function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1
  const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / pow10
  let nice = 1
  if      (norm < 1.5) nice = 1
  else if (norm < 3)   nice = 2
  else if (norm < 7)   nice = 5
  else                 nice = 10
  return nice * pow10
}
