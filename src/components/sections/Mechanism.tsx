import { SectHead, Reveal } from './SectHead'
import './sections.css'

export function Mechanism() {
  return (
    <section id="mechanism" data-num="01">
      <div className="shell">
        <SectHead num="01" label="the mechanism" numLabel="01">
          <em>One pool. One price.</em> ris3 trades like any standard ERC20 — and the vault makes
          <span className="acc"> 2× / 3× leverage available on top.</span>
          <div className="sect-sub">
            The token is plain: fixed supply, no transfer hooks, no admin. The pool is a standard
            Uniswap V4 pool with a single light hook that takes <strong>1% of every swap as ETH</strong>
            for the protocol vault. Leverage is fully opt-in via a separate vault contract that loans
            ETH from its own treasury — every leverage open is a clean single buy on the chart.
          </div>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="mech-stage">
              <div className="mech-card user">
                <div className="tag">i. you</div>
                <div className="big">0.10<span className="x">Ξ</span></div>
                <div className="deet">→ vault.open(3, minCollateral)</div>
                <div className="ledger">
                  <div className="ll"><span>margin in</span><strong>0.10 Ξ</strong></div>
                  <div className="ll"><span>leverage</span><strong>3× long</strong></div>
                  <div className="ll"><span>exposure</span><strong>0.30 Ξ</strong></div>
                </div>
              </div>

              <div className="mech-bridge"><span className="arrow">↦</span></div>

              <div className="mech-card pool">
                <div className="tag">ii. the vault</div>
                <div className="big">treasury<span className="x">Ξ</span></div>
                <div className="deet">debt + your margin → single swap</div>
                <div className="ledger">
                  <div className="ll"><span>treasury lends</span><span className="green">0.20 Ξ</span></div>
                  <div className="ll"><span>open fee</span><span className="green">0.0015 Ξ</span></div>
                  <div className="ll"><span>buy via UR</span><span className="green">0.2985 Ξ → ris3</span></div>
                  <div className="ll"><span>chart impact</span><span className="green">+3× buy</span></div>
                </div>
                <div className="invariant">clean single swap · no sell-then-buy</div>
              </div>

              <div className="mech-bridge"><span className="arrow">↦</span></div>

              <div className="mech-card position">
                <div className="tag">iii. position</div>
                <div className="big">ris3<span className="x">locked</span></div>
                <div className="deet">collateral · debt · openBlock</div>
                <div className="ledger">
                  <div className="ll"><span>collateral</span><strong>ris3 from buy</strong></div>
                  <div className="ll"><span>debt owed</span><strong>0.20 Ξ</strong></div>
                  <div className="ll"><span>liq threshold</span><strong>cv &lt; 1.5× debt</strong></div>
                  <div className="ll"><span>owner</span><strong>msg.sender</strong></div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <p className="mech-caption">
              <strong>Why this is honest leverage.</strong> Most "leveraged AMMs" use virtual reserves
              that hide trades from indexers, or sell-then-buy round trips that bait the chart. ris3 does
              neither — <em>every leverage event is a real swap against real LP</em>. If a 3× open pumps
              the chart, that's because real ETH (your margin + vault's debt) bought real ris3 from real
              liquidity. DEXScreener, Sigma, every sniper bot sees what's actually happening.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
