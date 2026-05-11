import { ReactNode } from 'react'
import { useReveal } from '../../hooks/useReveal'

/**
 * SectHead — fade-up reveals on scroll for section headers
 */
export function SectHead({
  num,
  label,
  numLabel,
  children,
}: {
  num: string
  label: string
  numLabel: string
  children: ReactNode
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`sect-head fade-up ${revealed ? 'revealed' : ''}`}>
      <div className="left">
        <span className="marker"></span>
        {label}
        <span className="num">{numLabel}</span>
      </div>
      <div className="right">{children}</div>
    </div>
  )
}

/**
 * Reveal — generic fade-up wrapper
 */
export function Reveal({
  children,
  delay,
  as: As = 'div',
  className = '',
  ...rest
}: {
  children: ReactNode
  delay?: 1 | 2 | 3 | 4
  as?: any
  className?: string
  [key: string]: any
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const delayClass = delay ? `delay-${delay}` : ''
  return (
    <As
      ref={ref}
      className={`fade-up ${delayClass} ${revealed ? 'revealed' : ''} ${className}`}
      {...rest}
    >
      {children}
    </As>
  )
}
