export function Banner() {
  return (
    <div className="banner">
      <div className="banner-inner">
        <span className="banner-tag">audited · v1</span>
        <span>
          <strong>Independently audited</strong> with <em>no critical or high severity findings.</em> Live-validated end-to-end including liquidation flow. 60 tests passing · 3,000 fuzz runs of K-invariance. Source on Etherscan. <a href="/paper.html">Read the math</a> before committing capital.
        </span>
      </div>
    </div>
  )
}
