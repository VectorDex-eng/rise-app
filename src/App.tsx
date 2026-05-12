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
              Long.
              <br />
              Levered. <span className="em">Onchain</span>
              <span className="dot"></span>
            </h1>

            <p className="hero-tagline">
              <strong>A token with a vault behind it.</strong> Trade ris3 plain like any V4 token — or open <em>2× / 3×</em> against vault ETH. Same pool, same chart, real LP.
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
