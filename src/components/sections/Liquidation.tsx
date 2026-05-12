import { SectHead, Reveal } from './SectHead'

export function Liquidation() {
  return (
    <section data-num="03" style={{ padding: '80px 0' }}>
      <div className="shell">
        <SectHead num="03" label="liquidation" numLabel="03">
          <em>Underwater positions get closed.</em> Anyone can call <span className="acc">liquidate()</span>
          when a position's collateral value drops below 1.5× its debt.
          <div className="sect-sub">
            The 1.5× threshold gives liquidators a 50% buffer to act before the vault takes a loss.
            Liquidators earn a 1% bounty (capped at 0.01 Ξ). Any remaining proceeds go to the vault
            treasury; any shortfall is absorbed by the treasury. <strong>No bad debt accumulates</strong> —
            every position eventually settles.
          </div>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="mech-stage">
              <div className="mech-card user">
                <div className="tag">i. health check</div>
                <div className="big">cv<span className="x">vs debt</span></div>
                <div className="deet">collateral_value &lt; 1.5 × debt</div>
                <div className="ledger">
                  <div className="ll"><span>collateral_value</span><strong>quote sell</strong></div>
                  <div className="ll"><span>debt</span><strong>at open</strong></div>
                  <div className="ll"><span>healthy?</span><span className="green">cv ≥ 1.5 × debt</span></div>
                  <div className="ll"><span>liquidatable?</span><span className="red">cv &lt; 1.5 × debt</span></div>
                </div>
              </div>

              <div className="mech-bridge"><span className="arrow">↦</span></div>

              <div className="mech-card pool">
                <div className="tag">ii. anyone calls</div>
                <div className="big">liquidate<span className="x">(id)</span></div>
                <div className="deet">permissionless · gas-paid by liquidator</div>
                <div className="ledger">
                  <div className="ll"><span>collateral sold</span><span className="red">via UR</span></div>
                  <div className="ll"><span>health re-checked</span><strong>on actual proceeds</strong></div>
                  <div className="ll"><span>healthy → revert</span><strong>PositionHealthy</strong></div>
                  <div className="ll"><span>caller</span><strong>= msg.sender</strong></div>
                </div>
                <div className="invariant">no privileged liquidator role</div>
              </div>

              <div className="mech-bridge"><span className="arrow">↦</span></div>

              <div className="mech-card position">
                <div className="tag">iii. settlement</div>
                <div className="big">bounty<span className="x">+ treasury</span></div>
                <div className="deet">1% to caller, rest to vault</div>
                <div className="ledger">
                  <div className="ll"><span>bounty</span><strong>1% (cap 0.01 Ξ)</strong></div>
                  <div className="ll"><span>debt repaid</span><strong>to treasury</strong></div>
                  <div className="ll"><span>surplus →</span><span className="green">treasuryEth ↑</span></div>
                  <div className="ll"><span>shortfall →</span><span className="red">treasuryEth ↓</span></div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <p className="mech-caption">
              <strong>Treasury rarely loses.</strong> At 1.5× threshold, the vault has 50% of headroom
              between "liquidatable" and "underwater". Most liquidations happen well above debt value —
              vault keeps surplus, liquidator earns bounty, position owner takes the L. The only loss
              scenarios are flash crashes where price drops past the threshold before any liquidator can
              execute. In normal markets, <em>the vault is a net earner on every leverage cycle</em>.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
