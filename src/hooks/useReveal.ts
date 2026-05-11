import { useEffect, useRef, useState } from 'react'

/**
 * useReveal — adds 'revealed' class to element when it enters viewport.
 * One-shot: doesn't re-trigger when element leaves and re-enters.
 *
 * Usage:
 *   const { ref, revealed } = useReveal()
 *   <div ref={ref} className={`fade-up ${revealed ? 'revealed' : ''}`}>
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {}
) {
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px', once = true } = options
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    // respect reduced motion — show immediately without animation
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }

    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setRevealed(true)
            if (once && ref.current) obs.unobserve(ref.current)
          } else if (!once) {
            setRevealed(false)
          }
        })
      },
      { threshold, rootMargin }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, revealed }
}

/**
 * useActiveSection — tracks which section ID is currently most-visible in viewport.
 * Used to highlight the topnav link as user scrolls.
 */
export function useActiveSection(sectionIds: string[], offset: number = 100): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY + offset
      let current: string | null = null
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.offsetTop
        const bottom = top + el.offsetHeight
        if (scrollY >= top && scrollY < bottom) {
          current = id
          break
        }
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sectionIds, offset])

  return active
}
