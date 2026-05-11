import { SectHead, Reveal } from './SectHead'

export function KInvariant() {
  return (
    <section id="k-invariant" data-num="02" style={{ padding: '80px 0', borderBottom: 'none' }}>
      <div className="shell">
        <SectHead num="02" label="the math" numLabel="02">
          Every state-changing path <em>preserves K exactly</em> — except liquidation, which drifts K by <span className="acc">precisely the bounty.</span>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="equation-feature">
              <div className="eq-formula-stage">
                <div className="eq-formula">
                  <span className="var">phantom_eth</span> <span className="op">×</span> <span className="var">curveTokens</span> <span className="op">=</span> <span className="k-letter">K</span>
                </div>
              </div>
              <div className="eq-explain">
                <p><strong>phantom_eth</strong> = <code>realETH + V + totalDebt + liquidationDeficit</code> — what the AMM treats as the ETH side of the curve.</p>
                <p>Open a position: <code>realETH</code> and <code>totalDebt</code> grow together, <code>curveTokens</code> falls. K stays exact.</p>
                <p>Close in profit: same in reverse. K stays exact.</p>
                <p>Liquidation: collateral routes to <code>redemptionTokens</code> (not the curve). K drifts down by <em>exactly</em> <code>bounty × curveTokens</code>. Monotone. Bounded.</p>
                <div className="punchline"><em>Proven by 3,000 fuzz runs.</em> Strict bound: <code>|K_drift − bounty × curveTokens| ≤ phantom_eth</code> (rounding only).</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
