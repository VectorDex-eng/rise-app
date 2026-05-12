import { useEffect, useRef } from 'react'

/**
 * Cascade prevention — side-by-side animated demo.
 * Left panel: naive leverage AMM → cascade → curve drained.
 * Right panel: rise w/ redemption pool → no cascade → K drift bounded by bounty.
 *
 * Animation choreography preserved from prior version; only visuals reskinned
 * to brutalist mono palette (black bg, mono fonts, sharp boxes, bracket labels).
 */
export function Cascade() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const naivePos = (i: number) => document.getElementById(`np${i + 1}`)
    const naiveTok = (i: number) => document.getElementById(`tp${i + 1}`) as SVGCircleElement | null
    const risePos  = (i: number) => document.getElementById(`rp${i + 1}`)
    const riseTok  = (i: number) => document.getElementById(`rt${i + 1}`) as SVGCircleElement | null
    const naiveCurve = () => document.getElementById('naive-curve') as SVGPathElement | null
    const naiveSpot  = () => document.getElementById('naive-spot') as SVGCircleElement | null
    const riseCurve  = () => document.getElementById('rise-curve') as SVGPathElement | null
    const poolCount  = () => document.getElementById('rise-pool-count')

    const setClass = (el: Element | null, cls: string) => el?.setAttribute('class', cls)

    const reset = () => {
      for (let i = 0; i < 5; i++) {
        setClass(naivePos(i), 'position-box healthy')
        setClass(risePos(i),  'position-box healthy')
        const nt = naiveTok(i)
        if (nt) { nt.style.transition = 'none'; nt.setAttribute('cy', '199'); nt.style.opacity = '0' }
        const rt = riseTok(i)
        if (rt) { rt.style.transition = 'none'; rt.setAttribute('cy', '199'); rt.style.opacity = '0' }
      }
      const nc = naiveCurve()
      if (nc) {
        nc.style.transition = 'none'
        nc.setAttribute('d', 'M 30 90 Q 200 60 370 100')
      }
      const ns = naiveSpot()
      if (ns) {
        ns.style.transition = 'none'
        ns.setAttribute('cy', '76')
        ns.setAttribute('fill', '#00ff85')
      }
      const rc = riseCurve()
      if (rc) {
        rc.style.transition = 'none'
        rc.setAttribute('d', 'M 30 90 Q 200 60 370 100')
      }
      const pc = poolCount()
      if (pc) pc.textContent = 'EMPTY'

      void document.body.offsetHeight
    }

    const ease   = 'cubic-bezier(0.4, 0, 0.2, 1)'
    const easeIn = 'cubic-bezier(0.55, 0.05, 0.45, 0.95)'

    const animateCascade = () => {
      reset()

      // Phase 1: all positions fade to warning
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          setClass(naivePos(i), 'position-box warning')
          setClass(risePos(i),  'position-box warning')
        }
      }, 700)

      // Phase 2 NAIVE: cascade — token flies up, curve sags, spot drops red
      for (let i = 0; i < 5; i++) {
        const delay = 1700 + i * 550
        setTimeout(() => {
          setClass(naivePos(i), 'position-box dead')
          const tok = naiveTok(i)
          if (tok) {
            tok.style.transition = `cy 0.7s ${easeIn}, opacity 0.35s ${ease}`
            tok.style.opacity = '1'
            tok.setAttribute('cy', '90')
          }
          const nc = naiveCurve()
          if (nc) {
            nc.style.transition = `d 0.7s ${ease}`
            const drop = 90 + (i + 1) * 11
            nc.setAttribute('d', `M 30 ${drop} Q 200 ${drop - 12} 370 ${drop + 22}`)
          }
          const ns = naiveSpot()
          if (ns) {
            ns.style.transition = `cy 0.7s ${ease}, fill 0.5s ${ease}`
            ns.setAttribute('cy', String(76 + (i + 1) * 10))
            if (i === 4) ns.setAttribute('fill', '#ff3d3d')
          }
        }, delay)
      }

      // Phase 2 RISE: positions go safe (green) + tokens drop down to redemption
      for (let i = 0; i < 5; i++) {
        const delay = 1700 + i * 420
        setTimeout(() => {
          setClass(risePos(i), 'position-box safe')
          const tok = riseTok(i)
          if (tok) {
            tok.style.transition = `cy 0.85s ${easeIn}, opacity 0.35s ${ease}`
            tok.style.opacity = '1'
            tok.setAttribute('cy', '273')
          }
          const pc = poolCount()
          if (pc) pc.textContent = `${i + 1} / 5 COLLATERALS ABSORBED`
        }, delay)
      }
    }

    let intervalId: number | null = null
    let running = false

    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !running) {
            running = true
            setTimeout(animateCascade, 500)
            intervalId = window.setInterval(animateCascade, 9500)
          } else if (!entry.isIntersecting && running) {
            running = false
            if (intervalId) { clearInterval(intervalId); intervalId = null }
          }
        })
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => {
      obs.disconnect()
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return (
    <section id="cascade" data-num="06" ref={sectionRef as any}>
      {/* brutalist palette overrides + animation states */}
      <style>{`
        .cas-viz { --cv-bg:#000; --cv-fg:#fff; --cv-mute:#888; --cv-line:#2f2f2f; --cv-grid:#161616;
                   --cv-buy:#00ff85; --cv-sell:#ff3d3d; --cv-warn:#fbbf24; }
        .position-box { fill: #050505; stroke: var(--cv-line); stroke-width: 1;
                        transition: fill 0.5s cubic-bezier(0.4,0,0.2,1),
                                    stroke 0.5s cubic-bezier(0.4,0,0.2,1),
                                    opacity 0.5s cubic-bezier(0.4,0,0.2,1); }
        .position-box.healthy { fill: #050505; stroke: var(--cv-line); }
        .position-box.warning { fill: #1a1300; stroke: var(--cv-warn); }
        .position-box.dead    { fill: #1a0808; stroke: var(--cv-sell); opacity: 0.4; }
        .position-box.safe    { fill: #001a0d; stroke: var(--cv-buy); }
        .curve-line   { stroke: var(--cv-fg); stroke-width: 1.4; fill: none; }
        .spot-marker  { fill: var(--cv-buy); stroke: var(--cv-bg); stroke-width: 1.5; }
        .token-particle      { fill: var(--cv-sell); opacity: 0; }
        .token-particle.rise { fill: var(--cv-buy); }
      `}</style>

      <div className="shell">
        <div className="sect-head">
          <div className="left">
            <span className="marker"></span>
            cascade prevention
            <span className="num">06</span>
          </div>
          <div className="right">
            <em>What kills naive leverage AMMs.</em> What ris3 <span className="acc">structurally prevents.</span>
            <div className="sect-sub">
              Liquidation cascades killed Mango ($100M). ris3's redemption pool routes confiscated collateral <em>out of the curve</em> — adjacent positions don't trigger from a single liquidation. Watch what happens when 5 positions liquidate at once.
            </div>
          </div>
        </div>

        <div className="sect-body">
          <div className="cascade-anim">

            {/* ─── NAIVE panel ─── */}
            <div className="cas-viz naive">
              <div className="cas-head">
                <span className="cas-tag">[ NAIVE LEVERAGE AMM ]</span>
                <span className="cas-name">DEATH SPIRAL</span>
              </div>

              <svg className="cas-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
                <path id="naive-curve" className="curve-line" d="M 30 90 Q 200 60 370 100" />
                <circle id="naive-spot" className="spot-marker" cx="200" cy="76" r="5" />
                <text x="30" y="50" fill="#888" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.16em">
                  CURVE · SPOT
                </text>
                {[40, 108, 176, 244, 312].map((tx, i) => (
                  <g key={i} transform={`translate(${tx}, 175)`}>
                    <rect className="position-box healthy" id={`np${i + 1}`} width="56" height="48" />
                    <text x="28" y="20" fill="#bdbdbd" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" letterSpacing="0.08em">
                      POS-{String(i + 1).padStart(2, '0')}
                    </text>
                    <text x="28" y="35" fill="#fff" fontSize="13" fontFamily="JetBrains Mono" fontWeight="600" textAnchor="middle">
                      3×
                    </text>
                  </g>
                ))}
                {[68, 136, 204, 272, 340].map((cx, i) => (
                  <circle key={i} className="token-particle" id={`tp${i + 1}`} cx={cx} cy="199" r="3.5" />
                ))}
                <text x="30" y="160" fill="#888" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.16em">
                  LIQUIDATION THRESHOLDS
                </text>
              </svg>

              <div className="cas-verdict cas-verdict-bad">
                <span className="cas-vd-tag">[ CASCADE ]</span>
                <span className="cas-vd-text">protocol drained</span>
                <span className="cas-vd-sub">precedent: Mango ($100M lost)</span>
              </div>
            </div>

            {/* ─── RISE panel ─── */}
            <div className="cas-viz rise">
              <div className="cas-head">
                <span className="cas-tag good">[ RIS3 · REDEMPTION POOL ]</span>
                <span className="cas-name">SINGLE-STEP EVENT</span>
              </div>

              <svg className="cas-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
                <path id="rise-curve" className="curve-line" d="M 30 90 Q 200 60 370 100" />
                <circle className="spot-marker" cx="200" cy="76" r="5" />
                <text x="30" y="50" fill="#888" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.16em">
                  CURVE · SPOT
                </text>
                {[40, 108, 176, 244, 312].map((tx, i) => (
                  <g key={i} transform={`translate(${tx}, 175)`}>
                    <rect className="position-box healthy" id={`rp${i + 1}`} width="56" height="48" />
                    <text x="28" y="20" fill="#bdbdbd" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" letterSpacing="0.08em">
                      POS-{String(i + 1).padStart(2, '0')}
                    </text>
                    <text x="28" y="35" fill="#fff" fontSize="13" fontFamily="JetBrains Mono" fontWeight="600" textAnchor="middle">
                      3×
                    </text>
                  </g>
                ))}
                {/* redemption pool box */}
                <rect x="30" y="248" width="340" height="50"
                      fill="#001a0d" stroke="#00ff85" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.85" />
                <text x="200" y="266" fill="#00ff85" fontSize="9" fontFamily="JetBrains Mono"
                      textAnchor="middle" letterSpacing="0.18em">
                  [ REDEMPTION POOL ]
                </text>
                <text id="rise-pool-count" x="200" y="285" fill="#888" fontSize="9" fontFamily="JetBrains Mono"
                      textAnchor="middle" letterSpacing="0.1em">
                  EMPTY
                </text>
                {[68, 136, 204, 272, 340].map((cx, i) => (
                  <circle key={i} className="token-particle rise" id={`rt${i + 1}`} cx={cx} cy="199" r="3.5" />
                ))}
                <text x="30" y="160" fill="#888" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.16em">
                  LIQUIDATION THRESHOLDS
                </text>
              </svg>

              <div className="cas-verdict cas-verdict-good">
                <span className="cas-vd-tag good">[ NO CASCADE ]</span>
                <span className="cas-vd-text">K drifts by bounty only</span>
                <span className="cas-vd-sub">curve unchanged · adjacent positions safe</span>
              </div>
            </div>

          </div>

          {/* ─── proof rows ─── */}
          <div className="cas-proof">
            <div className="cas-proof-head">
              <span className="cas-proof-badge">[ VERIFIED ON-CHAIN ]</span>
              <span className="cas-proof-test">test_Adversarial_FullCascade_5Positions</span>
            </div>
            <div className="cas-proof-grid">
              <ProofRow k="positions opened"      v="5 × 3×"        sub="0.1 Ξ each" />
              <ProofRow k="trigger"               v="−37%"          sub="50% bag dump" />
              <ProofRow k="liqs in 1 block"       v="5 / 5"         sub="same block" />
              <ProofRow k="K drift measured"     v="= bounty × T"  sub="zero rounding" good />
              <ProofRow k="curveTokens change"   v="0"              sub="cascade blocked" good />
              <ProofRow k="redemption pool"       v="Σ collaterals" sub="exact match" />
              <ProofRow k="solvency invariant"   v="HELD"           sub="at every step" good />
              <ProofRow k="recovery buy"          v="DRAINED"       sub="self-healed" good />
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function ProofRow({ k, v, sub, good }: { k: string; v: string; sub?: string; good?: boolean }) {
  return (
    <div className="cas-proof-row">
      <span className="ck">{k}</span>
      <span className={`cv ${good ? 'good' : ''}`}>{v}</span>
      {sub && <span className="csub">{sub}</span>}
    </div>
  )
}
