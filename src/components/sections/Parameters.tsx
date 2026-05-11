import { SectHead, Reveal } from './SectHead'

export function Parameters() {
  return (
    <section data-num="03" style={{ padding: '80px 0' }}>
      <div className="shell">
        <SectHead num="03" label="parameters" numLabel="03">
          <span style={{ fontSize: 32 }}><em>Set at deploy.</em> <em>Never change.</em></span>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="params-table">
              <Param k="token" v="$RIS3" />
              <Param k="supply" v="1M" sub="RIS3" />
              <Param k="virtual eth (V)" v="20" sub="Ξ" />
              <Param k="leverage" v="2x · 3x" featured />
              <Param k="liq threshold" v="1.3" sub="× debt" />
              <Param k="liq bounty" v="1%" sub="cap 0.01Ξ" />
              <Param k="global debt cap" v="40%" sub="pool" />
              <Param k="swap fee" v="50" sub="bps" />
              <Param k="interest" v="0%" sub="v1" />
              <Param k="min position" v="0.05" sub="Ξ" />
              <Param k="same-block guard" v="strict" />
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
