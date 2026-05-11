import { SectHead, Reveal } from './SectHead'

export function Lifecycle() {
  return (
    <section data-num="05">
      <div className="shell">
        <SectHead num="05" label="lifecycle" numLabel="05">
          <em>Open. Watch. Close.</em> Or get liquidated — <span className="acc">without taking the protocol down with you.</span>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="cycle">
              <Step n="i." t="open">
                Send <code>X</code> ETH. Pick <code>L ∈ {'{'}2, 3{'}'}</code>. Pool extends <code>(L−1)X</code> synthetic credit. Curve sees an <code>L × X</code> buy. You receive locked collateral and a position record.
              </Step>
              <Step n="ii." t="watch">
                Collateral marked at <em>curve sell-back</em> — the honest exit value. At open, equity = your input. Pump = equity grows. Dump = equity shrinks toward <code>debt × 1.3</code>.
              </Step>
              <Step n="iii." t="close">
                Sell collateral back to curve, repay debt, keep the excess. <code>minProceeds</code> slippage limit defends against sandwich attacks on close.
              </Step>
              <Step n="iv." t="or liquidate">
                Underwater? Anyone can call <code>liquidate</code>. Tokens route to <em>redemption pool</em> — never to the curve. <strong>No cascade.</strong> 1% bounty (cap 0.01 Ξ).
              </Step>
              <Step n="v." t="heal">
                Future unleveraged buyers drain the redemption pool at curve price. <code>liquidationDeficit</code> pays down. The protocol heals from buyer flow.
              </Step>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Step({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <div className="cycle-step">
      <div className="cycle-num">{n}</div>
      <div className="ttl">{t}</div>
      <div className="body">{children}</div>
    </div>
  )
}
