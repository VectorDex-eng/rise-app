import { SectHead, Reveal } from './SectHead'

export function Scenarios() {
  const rows = [
    { n: 'Owner refusal', d: 'Position holder refuses to close at any price', r: 'Anyone can liquidate when underwater. 1% bounty incentivizes keepers.', v: 'mitigated', vc: 'ok' },
    { n: 'Same-block exploit', d: 'Open + manipulate + liquidate in one tx', r: 'Strict same-block guard rejects liquidation of positions opened this block.', v: 'mitigated', vc: 'ok' },
    { n: 'Sandwich on open', d: 'MEV front-runs leveraged buy to extract slippage', r: 'minCollateral parameter; tx reverts if bot pushes price beyond tolerance.', v: 'mitigated', vc: 'ok' },
    { n: 'Sandwich on close', d: 'MEV front-runs position close', r: 'minProceeds parameter; same protection on the exit side.', v: 'mitigated', vc: 'ok' },
    { n: 'Mass liquidation', d: 'Whale dumps to trigger every leveraged position', r: 'Redemption pool absorbs collateral. Adjacent positions unaffected. K drifts only by bounty × T.', v: 'structural', vc: 'def' },
    { n: 'Reentrancy', d: 'Reenter via ERC-6909 transfer hook', r: 'nonReentrant + CEI pattern on all entrypoints. ERC-6909 settlement audited clean.', v: 'mitigated', vc: 'ok' },
    { n: 'Phantom inflation', d: 'Manipulate liquidationDeficit to inflate collateral value', r: 'liquidationDeficit only grows via liquidate(); only shrinks via redemption pool drain. Monotone.', v: 'structural', vc: 'def' },
    { n: 'Underwater debt', d: 'Position closes when cv < debt', r: 'Shortfall added to liquidationDeficit. Repaid by future buyers via redemption pool.', v: 'absorbed', vc: 'ok' },
    { n: 'Global cap saturation', d: 'Debt cap fills, no new positions openable', r: 'By design — debt is capped at 40% of (realETH + V). Cap relaxes as realETH grows. Acknowledged limit.', v: 'by design', vc: 'def' },
    { n: 'Owner griefing donate', d: 'Donate ETH directly to disrupt bookkeeping', r: 'receive() restricted to PoolManager in v1.1. Audit finding L-2.', v: 'patched v1.1', vc: 'ok' },
  ]

  return (
    <section id="scenarios" data-num="07">
      <div className="shell">
        <SectHead num="07" label="adversarial scenarios" numLabel="07">
          <em>Every attack we modeled.</em> What the protocol does. <span className="acc">No hand-waving.</span>
          <div className="sect-sub">Each scenario has a corresponding test in the suite. The audit verified the defenses match the design. 60 tests passing, 3000 fuzz runs of K-invariance.</div>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="scenarios">
              <div className="sc-row header">
                <span>scenario</span>
                <span>description</span>
                <span>protocol response</span>
                <span>verdict</span>
              </div>
              {rows.map((r, i) => (
                <div className="sc-row" key={i}>
                  <span className="name">{r.n}</span>
                  <span className="desc">{r.d}</span>
                  <span className="result">{r.r}</span>
                  <span className={`verdict ${r.vc}`}>{r.v}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
