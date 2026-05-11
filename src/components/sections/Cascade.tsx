import { useEffect, useRef } from 'react'

export function Cascade() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const naivePos = (i: number) => document.getElementById(`np${i + 1}`)
    const naiveTok = (i: number) => document.getElementById(`tp${i + 1}`) as SVGCircleElement | null
    const ris3Pos = (i: number) => document.getElementById(`rp${i + 1}`)
    const ris3Tok = (i: number) => document.getElementById(`rt${i + 1}`) as SVGCircleElement | null
    const naiveCurve = () => document.getElementById('naive-curve') as SVGPathElement | null
    const naiveSpot = () => document.getElementById('naive-spot') as SVGCircleElement | null
    const ris3Curve = () => document.getElementById('ris3-curve') as SVGPathElement | null
    const poolCount = () => document.getElementById('ris3-pool-count')

    const setClass = (el: Element | null, cls: string) => el?.setAttribute('class', cls)

    const reset = () => {
      for (let i = 0; i < 5; i++) {
        setClass(naivePos(i), 'position-box healthy')
        setClass(ris3Pos(i), 'position-box healthy')

        const nt = naiveTok(i)
        if (nt) {
          nt.style.transition = 'none'
          nt.setAttribute('cy', '199')
          nt.style.opacity = '0'
        }
        const rt = ris3Tok(i)
        if (rt) {
          rt.style.transition = 'none'
          rt.setAttribute('cy', '199')
          rt.style.opacity = '0'
        }
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
        ns.setAttribute('fill', '#ff5a2b')
      }
      const rc = ris3Curve()
      if (rc) {
        rc.style.transition = 'none'
        rc.setAttribute('d', 'M 30 90 Q 200 60 370 100')
      }
      const pc = poolCount()
      if (pc) pc.textContent = 'empty'

      // force reflow so subsequent transitions take effect
      void document.body.offsetHeight
    }

    const ease = 'cubic-bezier(0.4, 0, 0.2, 1)'
    const easeIn = 'cubic-bezier(0.55, 0.05, 0.45, 0.95)'

    const animateCascade = () => {
      reset()

      // Phase 1: all positions fade to warning (smooth color crossfade)
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          setClass(naivePos(i), 'position-box warning')
          setClass(ris3Pos(i), 'position-box warning')
        }
      }, 700)

      // Phase 2 (NAIVE): cascade — each position dies, token flies up into curve, curve sags
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
            if (i === 4) ns.setAttribute('fill', '#f04848')
          }
        }, delay)
      }

      // Phase 2 (RIS3): positions go safe (green) and tokens drop DOWN to redemption pool, no cascade
      for (let i = 0; i < 5; i++) {
        const delay = 1700 + i * 420
        setTimeout(() => {
          setClass(ris3Pos(i), 'position-box safe')
          const tok = ris3Tok(i)
          if (tok) {
            tok.style.transition = `cy 0.85s ${easeIn}, opacity 0.35s ${ease}`
            tok.style.opacity = '1'
            tok.setAttribute('cy', '273')
          }
          const pc = poolCount()
          if (pc) pc.textContent = `${i + 1} / 5 collaterals absorbed`
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
      <style>{`
        .position-box { fill: var(--bg-3); stroke: var(--line-3); stroke-width: 1; transition: fill 0.5s cubic-bezier(0.4,0,0.2,1), stroke 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s cubic-bezier(0.4,0,0.2,1); }
        .position-box.healthy { fill: var(--bg-3); stroke: var(--line-3); }
        .position-box.warning { fill: rgba(245,179,66,0.15); stroke: var(--yel); }
        .position-box.dead { fill: rgba(240,72,72,0.1); stroke: var(--red); opacity: 0.4; }
        .position-box.safe { fill: rgba(52,211,156,0.08); stroke: var(--grn); }
        .curve-line { stroke: var(--ink-3); stroke-width: 1.2; fill: none; }
        .spot-marker { fill: var(--acc); stroke: var(--bg); stroke-width: 1.5; }
        .token-particle { fill: var(--red); opacity: 0; }
        .token-particle.ris3 { fill: var(--grn); }
      `}</style>

      <div className="shell">
        <div className="sect-head">
          <div className="left">
            <span className="marker"></span>
            cascade prevention
            <span className="num">06</span>
          </div>
          <div className="right">
            <em>What kills naive leverage AMMs.</em> What $RIS3 <span className="acc">structurally prevents.</span>
            <div className="sect-sub">Liquidation cascades killed Mango ($100M lost). $RIS3's redemption pool routes confiscated collateral <em>out of the curve</em> — adjacent positions don't trigger from a single liquidation. Watch what happens when 5 positions liquidate simultaneously.</div>
          </div>
        </div>

        <div className="sect-body">
          <div className="cascade-anim">
            <div className="cas-viz naive">
              <div className="head">naive leverage AMM</div>
              <div className="name">death spiral</div>
              <svg className="cas-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
                <path id="naive-curve" className="curve-line" d="M 30 90 Q 200 60 370 100" />
                <circle id="naive-spot" className="spot-marker" cx="200" cy="76" r="5" />
                <text x="30" y="50" fill="#78787f" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.1em">CURVE · SPOT</text>
                {[40, 108, 176, 244, 312].map((tx, i) => (
                  <g key={i} transform={`translate(${tx}, 175)`}>
                    <rect className="position-box healthy" id={`np${i + 1}`} width="56" height="48" rx="2" />
                    <text x="28" y="20" fill="#b8b8be" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">POS #{i + 1}</text>
                    <text x="28" y="36" fill="#f0f0f1" fontSize="11" fontFamily="Fraunces" fontStyle="italic" textAnchor="middle">3x</text>
                  </g>
                ))}
                {[68, 136, 204, 272, 340].map((cx, i) => (
                  <circle key={i} className="token-particle" id={`tp${i + 1}`} cx={cx} cy="199" r="3" />
                ))}
                <text x="30" y="160" fill="#78787f" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.1em">LIQUIDATION THRESHOLDS</text>
              </svg>
              <div className="verdict">Cascade. Protocol drained.<small>Real precedent: Mango ($100M loss)</small></div>
            </div>

            <div className="cas-viz ris3">
              <div className="head">$RIS3 with redemption pool</div>
              <div className="name">single-step event</div>
              <svg className="cas-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
                <path id="ris3-curve" className="curve-line" d="M 30 90 Q 200 60 370 100" />
                <circle className="spot-marker" cx="200" cy="76" r="5" />
                <text x="30" y="50" fill="#78787f" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.1em">CURVE · SPOT</text>
                {[40, 108, 176, 244, 312].map((tx, i) => (
                  <g key={i} transform={`translate(${tx}, 175)`}>
                    <rect className="position-box healthy" id={`rp${i + 1}`} width="56" height="48" rx="2" />
                    <text x="28" y="20" fill="#b8b8be" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">POS #{i + 1}</text>
                    <text x="28" y="36" fill="#f0f0f1" fontSize="11" fontFamily="Fraunces" fontStyle="italic" textAnchor="middle">3x</text>
                  </g>
                ))}
                <rect x="30" y="248" width="340" height="50" rx="2" fill="rgba(52,211,156,0.05)" stroke="#34d39c" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                <text x="200" y="266" fill="#34d39c" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" letterSpacing="0.14em">REDEMPTION POOL</text>
                <text id="ris3-pool-count" x="200" y="285" fill="#78787f" fontSize="9" fontFamily="Fraunces" fontStyle="italic" textAnchor="middle">empty</text>
                {[68, 136, 204, 272, 340].map((cx, i) => (
                  <circle key={i} className="token-particle ris3" id={`rt${i + 1}`} cx={cx} cy="199" r="3" />
                ))}
                <text x="30" y="160" fill="#78787f" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="0.1em">LIQUIDATION THRESHOLDS</text>
              </svg>
              <div className="verdict">Cascade prevented. K drifts by bounty only.<small>Curve unchanged · adjacent positions safe</small></div>
            </div>
          </div>

          <div className="cas-proof">
            <div className="head">
              <span className="badge">◆ verified on-chain</span>
              <span>test_Adversarial_FullCascade_5Positions · sepolia</span>
            </div>
            <div className="proof-grid">
              <div className="proof-item"><div className="k">positions opened</div><div className="v">5 × 3x<small>0.1 Ξ each</small></div></div>
              <div className="proof-item"><div className="k">trigger</div><div className="v">−37%<small>50% bag dump</small></div></div>
              <div className="proof-item"><div className="k">liquidations in 1 block</div><div className="v">5 / 5<small>same block</small></div></div>
              <div className="proof-item"><div className="k">K drift measured</div><div className="v grn">= bounty × T<small>zero rounding</small></div></div>
              <div className="proof-item"><div className="k">curveTokens change</div><div className="v grn">0<small>cascade blocked</small></div></div>
              <div className="proof-item"><div className="k">redemption pool</div><div className="v">= Σ collaterals<small>exact match</small></div></div>
              <div className="proof-item"><div className="k">solvency invariant</div><div className="v grn">held<small>at every step</small></div></div>
              <div className="proof-item"><div className="k">recovery buy</div><div className="v grn">redemption drained<small>self-healed</small></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
