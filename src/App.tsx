import { TradeWidget } from './components/TradeWidget'
import { TopBar } from './components/TopBar'
import { TickerStrip } from './components/TickerStrip'
import { Banner } from './components/Banner'
import { Mechanism } from './components/sections/Mechanism'
import { KInvariant } from './components/sections/KInvariant'
import { Parameters } from './components/sections/Parameters'
import { PriceImpact } from './components/sections/PriceImpact'
import { Lifecycle } from './components/sections/Lifecycle'
import { Cascade } from './components/sections/Cascade'
import { Scenarios } from './components/sections/Scenarios'
import { Limits } from './components/sections/Limits'
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
              <span className="badge">v1</span>
              <span className="div"></span>
              <span>long-only on-chain leverage</span>
              <span className="div"></span>
              <span>uniswap v4 hook</span>
            </div>

            <h1 className="headline">
              Long the <span className="em">curve.</span>
              <br />
              Up to <span className="x">3x</span>
              <span className="dot"></span>
            </h1>

            <p className="hero-tagline">
              A bonding curve <em>that lets you lever it.</em> <strong>The pool extends synthetic credit.</strong> The curve is the protocol. The pool is your counterparty.
            </p>

            <div className="hero-actions">
              <a href="#mechanism" className="btn">How it works</a>
              <a href="/paper.html" className="btn">Yellow paper</a>
            </div>
          </div>

          <aside>
            <TradeWidget />
          </aside>
        </section>
      </div>

      <Banner />
      <Mechanism />
      <KInvariant />
      <Parameters />
      <PriceImpact />
      <Lifecycle />
      <Cascade />
      <Scenarios />
      <Limits />
      <ContractBar />
      <Footer />
    </>
  )
}
