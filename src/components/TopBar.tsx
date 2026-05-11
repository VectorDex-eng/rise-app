import { useEffect, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { chainName, DEFAULT_CHAIN_ID } from '../lib/config'
import { useActiveSection } from '../hooks/useReveal'

const navLinks = [
  { href: '#mechanism', id: 'mechanism', label: 'mechanism' },
  { href: '#k-invariant', id: 'k-invariant', label: 'K invariant' },
  { href: '#cascade', id: 'cascade', label: 'cascade' },
  { href: '#scenarios', id: 'scenarios', label: 'scenarios' },
]

export function TopBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const active = useActiveSection(navLinks.map(l => l.id), 120)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // close mobile nav when a link is clicked
  const closeMobile = () => setMobileOpen(false)

  // close on escape
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <>
      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="topbar-inner">
          <a href="#" className="brand" style={{ textDecoration: 'none' }}>
            <span className="sigil">$</span>RIS3<span className="v">v1</span>
          </a>
          <nav className="topnav">
            {navLinks.map(l => (
              <a key={l.id} href={l.href} className={active === l.id ? 'active' : ''}>
                {l.label}
              </a>
            ))}
            <a href="/paper.html">paper ↗</a>
          </nav>
          <div className="top-right">
            <span className="net-pill">testnet · {chainName(DEFAULT_CHAIN_ID)}</span>
            <ConnectKitButton.Custom>
              {({ isConnected, show, truncatedAddress }) => (
                <button
                  className="btn primary"
                  onClick={show}
                  style={{ padding: '11px 22px', fontSize: 11 }}
                >
                  {isConnected ? truncatedAddress : 'Connect'}
                </button>
              )}
            </ConnectKitButton.Custom>
            <button
              className={`nav-toggle ${mobileOpen ? 'open' : ''}`}
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        {navLinks.map(l => (
          <a
            key={l.id}
            href={l.href}
            className={active === l.id ? 'active' : ''}
            onClick={closeMobile}
          >
            {l.label}
          </a>
        ))}
        <a href="/paper.html" onClick={closeMobile}>paper ↗</a>
      </div>
    </>
  )
}
