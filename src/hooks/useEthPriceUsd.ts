import { useEffect, useState } from 'react'

const FALLBACK_USD = 3000

export function useEthPriceUsd() {
  const [price, setPrice] = useState<number>(() => {
    if (typeof sessionStorage === 'undefined') return FALLBACK_USD
    const cached = sessionStorage.getItem('eth-usd')
    if (cached) {
      const n = Number(cached)
      if (Number.isFinite(n) && n > 100) return n
    }
    return FALLBACK_USD
  })

  useEffect(() => {
    let cancelled = false
    const fetchPrice = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        if (!r.ok) return
        const data = await r.json()
        const p = data?.ethereum?.usd
        if (typeof p === 'number' && p > 100 && !cancelled) {
          setPrice(p)
          try { sessionStorage.setItem('eth-usd', String(p)) } catch {}
        }
      } catch {}
    }
    fetchPrice()
    return () => { cancelled = true }
  }, [])

  return price
}