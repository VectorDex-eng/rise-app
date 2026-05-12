import { TradeWidget } from './components/TradeWidget'
import { TopBar } from './components/TopBar'
import { TickerStrip } from './components/TickerStrip'
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
              <span className="badge">v1</span>
              <span className="div"></span>
              <span>token + optional leverage</span>
              <span className="div"></span>
              <span>uniswap v4</span>
            </div>

            <h1 className="headline">
              <span className="em">ris3</span>
              <br />
              Up to <span className="x">3x</span>
              <span className="dot"></span>
            </h1>

            <p className="hero-tagline">
              A token with built-in leverage. <em>Buy ris3 like any ERC20</em> — or open a 2× / 3× position via the on-chain vault. <strong>The vault provides the debt.</strong> You provide the conviction.
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
      <Parameters />
      <Liquidation />
      <Stack />
      <ContractBar />
      <Footer />
    </>
  )
}
