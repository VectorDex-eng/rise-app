import { SectHead, Reveal } from './SectHead'

export function Limits() {
  return (
    <section data-num="08">
      <div className="shell">
        <SectHead num="08" label="honest limits" numLabel="08">
          <em>What v1 does not do.</em> <span className="acc">No version of this is "safe."</span>
          <div className="sect-sub">Every protocol that hides its limits hides them until they bite. Listed in priority order — what we'd address in v2.</div>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="limits">
              <Limit n="i." h="Audited — but new code.">
                Independently audited. <strong>No critical or high findings.</strong> Medium findings (cascade-induced sell DoS, fee-withdraw plumbing) tracked and patched in v1.1. Audit was one set of eyes — not a guarantee. Code is novel. Treat capital as at risk.
              </Limit>
              <Limit n="ii." h="0% interest = perpetual long.">
                Positions don't decay. A trader can sit underwater-but-not-liquidatable forever. v0.2 will introduce stability interest. Decision: keep v1 simple, ship.
              </Limit>
              <Limit n="iii." h="Global debt cap, not per-user.">
                One wallet could deploy ~4 Ξ at 3x to fill the entire global cap on an empty pool. Sybil-bypassable trivially. Fix is interest (makes capital cost-of-time real), not per-user limits.
              </Limit>
              <Limit n="iv." h="Long-only.">
                The math is fully symmetric — shorts work — but the v1 implementation is one-sided. Shorts add per-position state we chose to skip for v1. Targeted for v0.2.
              </Limit>
              <Limit n="v." h="Liquidator availability assumed.">
                No protocol-run keeper. Bounty is 1% of debt (cap 0.01 Ξ). Adequate at depth; sub-economic for tiny positions in high gas. Pool can briefly sit underwater if no keeper bites.
              </Limit>
              <Limit n="vi." h="Redemption pool drain timing.">
                Confiscated collateral sits in the redemption pool until unleveraged buyers arrive. No timeout. In a deep drawdown, the deficit can persist. <code>liquidationDeficit</code> is publicly visible.
              </Limit>
              <Limit n="vii." h="Front-run risk on open.">
                minCollateral protects against bad executions, but a determined searcher can move the curve between block proposals. Slippage discipline is on the user — defaults are 1%.
              </Limit>
              <Limit n="viii." h="Bonding curve is the only venue.">
                No external oracle. No DEX hops. Liquidity is the curve. That's the point — but it means you cannot exit when the curve is empty. Exit when others have entered.
              </Limit>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Limit({ n, h, children }: { n: string; h: string; children: React.ReactNode }) {
  return (
    <div className="limit">
      <div className="n">{n}</div>
      <h4>{h}</h4>
      <p>{children}</p>
    </div>
  )
}
