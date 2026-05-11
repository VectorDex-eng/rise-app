import { SectHead, Reveal } from './SectHead'
import './sections.css'

export function Mechanism() {
  return (
    <section id="mechanism" data-num="01">
      <div className="shell">
        <SectHead num="01" label="the mechanism" numLabel="01">
          <em>One transaction.</em> The pool extends credit, the curve takes the leveraged buy, your collateral gets locked. <span className="acc">K invariant preserved exactly.</span>
          <div className="sect-sub">
            The pool treats the curve as if L × X ETH entered. Your X grows realETH directly. The remaining (L − 1) × X is tracked as synthetic debt — no actual ETH is loaned. The curve just <em>prices</em> as if the leveraged amount entered.
          </div>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="mech-stage">
              <div className="mech-card user">
                <div className="tag">i. you</div>
                <div className="big">0.10<span className="x">Ξ</span></div>
                <div className="deet">→ msg.value · pick leverage</div>
                <div className="ledger">
                  <div className="ll"><span>tier</span><strong>3x long</strong></div>
                  <div className="ll"><span>capital at risk</span><strong>0.10 Ξ</strong></div>
                  <div className="ll"><span>exposure</span><strong>0.30 Ξ</strong></div>
                </div>
              </div>

              <div className="mech-bridge"><span className="arrow">↦</span></div>

              <div className="mech-card pool">
                <div className="tag">ii. the curve</div>
                <div className="big">K<span className="x">=2×10⁴³</span></div>
                <div className="deet">phantom_eth × curveTokens · invariant</div>
                <div className="ledger">
                  <div className="ll"><span>realETH</span><span className="green">+ 0.10 Ξ</span></div>
                  <div className="ll"><span>totalDebt</span><span className="green">+ 0.20 Ξ</span></div>
                  <div className="ll"><span>curveTokens</span><span className="red">− ΔT</span></div>
                  <div className="ll"><span>phantom_eth</span><span className="green">+ 0.30 Ξ</span></div>
                </div>
                <div className="invariant">K preserved · exactly</div>
              </div>

              <div className="mech-bridge"><span className="arrow">↦</span></div>

              <div className="mech-card position">
                <div className="tag">iii. position</div>
                <div className="big">ΔT<span className="x">$</span></div>
                <div className="deet">RISE locked as collateral</div>
                <div className="ledger">
                  <div className="ll"><span>debt owed</span><strong>0.20 Ξ</strong></div>
                  <div className="ll"><span>liq threshold</span><strong>cv &lt; 0.26 Ξ</strong></div>
                  <div className="ll"><span>bounty</span><strong>1% (cap 0.01 Ξ)</strong></div>
                  <div className="ll"><span>owner</span><strong>msg.sender</strong></div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <p className="mech-caption">
              <strong>The split-pricing fix.</strong> Naive leverage AMMs mark collateral at post-buy spot, <em>inflating apparent equity above what could actually be realized on close.</em> $RISE marks at curve sell-back, the honest answer to "how much could I close for right now." At the moment of open, sell-back equals exactly L × X. Equity = X = user input. Symmetric.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
