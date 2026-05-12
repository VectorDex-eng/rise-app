import { TradeWidget } from './components/TradeWidget'
import { TopBar } from './components/TopBar'
import { TickerStrip } from './components/TickerStrip'
import { TreasuryHero } from './components/TreasuryHero'
import { Banner } from './components/Banner'
import { Mechanism } from './components/sections/Mechanism'
import { Parameters } from './components/sections/Parameters'
import { Liquidation } from './components/sections/Liquidation'
import { Stack } from './components/sections/Stack'
import { ContractBar } from './components/ContractBar'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <TickerStrip />
      <TopBar />

      {/* HERO with widget on the right */}
      <div className="shell">
        <section className="hero" style={{ borderBottom: 'none' }}>
          <div className="hero-l">
            <div className="hero-meta">
              <span>uniswap v4 hook</span>
              <span className="div"></span>
              <span>mainnet</span>
            </div>

            <h1 className="headline">
              Long.<br />
              Levered.<br />
              <span className="em">Onchain.</span>
            </h1>

            <p className="hero-tagline">
              A <strong>fee-hook V4 pool</strong> with a <strong>leverage vault</strong> on top.
              Trade ris3 like any token, or open <em>2× / 3×</em> against vault ETH. The hook skims
              1% of every swap to the vault — <em>the protocol earns from every trade</em>.
            </p>

            <TreasuryHero />

            <div className="hero-actions">
              <a href="/paper.html" className="btn">Yellow paper ↗</a>
              <a href="#mechanism" className="btn ghost">How it works</a>
            </div>
          </div>

          <aside>
            <TradeWidget />
          </aside>
        </section>
      </div>

      <Banner />
      <Mechanism />
      <Parameters />
      <Liquidation />
      <Stack />
      <ContractBar />
      <Footer />
    </>
  )
}
