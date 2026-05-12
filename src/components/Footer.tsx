export function Footer() {
  return (
    <footer>
      <div className="foot-inner">
        <div>
          <div className="foot-brand"><span className="sigil">$</span>RIS3</div>
          <div className="foot-tag">
            A fixed-supply ERC20 on Uniswap V4 with a treasury-backed leverage vault. Trade like any
            token, or open 2× / 3× longs against vault ETH. Hook skims 1% of every swap to the vault.
            No admin keys, no upgradability.
          </div>
        </div>
        <div className="foot-col">
          <h5>protocol</h5>
          <ul>
            <li><a href="#mechanism">mechanism</a></li>
            <li><a href="#parameters">parameters</a></li>
            <li><a href="#liquidation">liquidation</a></li>
            <li><a href="#stack">the stack</a></li>
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
            <li>uniswap v4 (mainnet)</li>
            <li>L1 ethereum</li>
            <li>1% hook fee → vault</li>
            <li>2× · 3× long</li>
            <li>min position 0.05 Ξ</li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <div>$RIS3 v1 · plain ERC20 + V4 fee hook + leverage vault · no admin keys</div>
        <div className="sig"><em>token + leverage. up to 3x.</em></div>
      </div>
    </footer>
  )
}
