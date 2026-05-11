export function Footer() {
  return (
    <footer>
      <div className="foot-inner">
        <div>
          <div className="foot-brand"><span className="sigil">$</span>RISE</div>
          <div className="foot-tag">
            A bonding curve that lets you lever it. The pool extends synthetic credit for every leveraged buy. K invariant preserved exactly except at liquidation, which drifts K by precisely the bounty.
          </div>
        </div>
        <div className="foot-col">
          <h5>protocol</h5>
          <ul>
            <li><a href="#mechanism">mechanism</a></li>
            <li><a href="#k-invariant">K invariant</a></li>
            <li><a href="#cascade">cascade prevention</a></li>
            <li><a href="#scenarios">adversarial scenarios</a></li>
            <li><a href="/paper.html">yellow paper ↗</a></li>
          </ul>
        </div>
        <div className="foot-col">
          <h5>connect</h5>
          <ul>
            <li><a href="https://x.com/" target="_blank" rel="noopener noreferrer">twitter ↗</a></li>
            <li><a href="https://t.me/" target="_blank" rel="noopener noreferrer">telegram ↗</a></li>
            <li><a href="https://github.com/" target="_blank" rel="noopener noreferrer">github ↗</a></li>
          </ul>
        </div>
        <div className="foot-col">
          <h5>venue</h5>
          <ul>
            <li>uniswap v4 hook</li>
            <li>L1 ethereum</li>
            <li>50 bps swap fee</li>
            <li>2x · 3x long</li>
            <li>min 0.05 Ξ</li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <div>$RISE v1 · uniswap v4 hook · 60 tests · 3,000 fuzz runs · audited</div>
        <div className="sig"><em>long the curve. up to 3x.</em></div>
      </div>
    </footer>
  )
}
