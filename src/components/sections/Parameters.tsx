import { SectHead, Reveal } from './SectHead'

export function Parameters() {
  return (
    <section data-num="02" style={{ padding: '80px 0' }}>
      <div className="shell">
        <SectHead num="02" label="parameters" numLabel="02">
          <span style={{ fontSize: 32 }}><em>Immutable.</em> <em>On chain.</em></span>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="params-table">
              <Param k="token" v="$RIS3" />
              <Param k="supply" v="1M" sub="RIS3" />
              <Param k="leverage" v="2x · 3x" featured />
              <Param k="hook fee" v="1%" sub="every swap → vault" />
              <Param k="lp fee" v="1%" sub="V4 tier" />
              <Param k="open fee" v="0.5%" sub="leveraged size" />
              <Param k="liq threshold" v="1.5" sub="× debt" />
              <Param k="liq bounty" v="1%" sub="cap 0.01Ξ" />
              <Param k="min position" v="0.05" sub="Ξ" />
              <Param k="same-block close" v="blocked" />
              <Param k="vault admin" v="owner only" sub="treasury" />
              <Param k="chain" v="ETH" sub="L1" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Param({ k, v, sub, featured }: { k: string; v: string; sub?: string; featured?: boolean }) {
  return (
    <div className={`param ${featured ? 'featured' : ''}`}>
      <div className="k">{k}</div>
      <div className="v">{v}{sub && <span className="sub">{sub}</span>}</div>
    </div>
  )
}
