/**
 * curve math — mirrors the on-chain math for quote display.
 * All integer math, no floats. Inputs/outputs in wei (bigint).
 *
 * IMPORTANT: these are quotes for UX. Actual transaction values come from
 * the contract. We slippage-protect against quote drift via minCollateral /
 * minProceeds parameters.
 *
 * Reference: docs/leverage-v1.md §3
 */

import { K_CONST, V_ETH, LIQ_THRESHOLD_BPS } from './config'

/**
 * phantom_eth = realETH + V + totalDebt + liquidationDeficit
 */
export function phantomEth(
  realETH: bigint,
  totalDebt: bigint,
  liquidationDeficit: bigint
): bigint {
  return realETH + V_ETH + totalDebt + liquidationDeficit
}

/**
 * Spot price (ETH per RISE, in wei).
 * spot = phantom_eth / curveTokens
 * Multiplied by 1e18 to preserve precision; result is gwei * 1e9
 */
export function spotPrice(phantom: bigint, curveTokens: bigint): bigint {
  if (curveTokens === 0n) return 0n
  return (phantom * 10n ** 18n) / curveTokens
}

/**
 * Unleveraged buy quote: ETH in → RISE out (gross, before fee).
 *
 *   ΔT = curveTokens − K / (phantom + ethIn)
 *
 * NOTE: For leveraged opens, this gross is computed with L * ethIn as the
 *       effective curve-impact, then ΔT is the user's collateral.
 */
export function quoteBuyGross(
  phantom: bigint,
  curveTokens: bigint,
  ethIn: bigint
): bigint {
  if (ethIn === 0n) return 0n
  const newPhantom = phantom + ethIn
  const newCurve = K_CONST / newPhantom
  if (newCurve >= curveTokens) return 0n
  return curveTokens - newCurve
}

/**
 * Unleveraged sell quote: RISE in → ETH out (gross, before fee).
 *
 *   ΔE = phantom − K / (curveTokens + ris3In)
 */
export function quoteSellGross(
  phantom: bigint,
  curveTokens: bigint,
  ris3In: bigint
): bigint {
  if (ris3In === 0n) return 0n
  const newCurve = curveTokens + ris3In
  const newPhantom = K_CONST / newCurve
  if (newPhantom >= phantom) return 0n
  return phantom - newPhantom
}

/**
 * Apply swap fee (50 bps) on the output side.
 */
export function applyFee(grossOut: bigint, feeBps: bigint = 50n): bigint {
  return (grossOut * (10000n - feeBps)) / 10000n
}

/**
 * Leverage open quote.
 *
 *   curveImpact = L × ethIn
 *   collateral  = curveTokens − K / (phantom + curveImpact)
 *   debt        = (L − 1) × ethIn
 *
 *   liquidationSpot = approx price at which collateralValue(collateral) < debt × 1.3
 */
export function quoteOpen(
  phantom: bigint,
  curveTokens: bigint,
  ethIn: bigint,
  leverage: number
): {
  collateral: bigint
  debt: bigint
  curveImpact: bigint
  postPhantom: bigint
  postCurveTokens: bigint
  liquidationCv: bigint
} {
  const L = BigInt(leverage)
  const curveImpact = L * ethIn
  const debt = (L - 1n) * ethIn

  const collateral = quoteBuyGross(phantom, curveTokens, curveImpact)
  const postPhantom = phantom + curveImpact
  const postCurveTokens = curveTokens - collateral
  const liquidationCv = (debt * LIQ_THRESHOLD_BPS) / 10000n

  return {
    collateral,
    debt,
    curveImpact,
    postPhantom,
    postCurveTokens,
    liquidationCv
  }
}

/**
 * Close quote — sell collateral back, repay debt, return excess.
 */
export function quoteClose(
  phantom: bigint,
  curveTokens: bigint,
  collateral: bigint,
  debt: bigint
): { gross: bigint; toUser: bigint; shortfall: bigint } {
  const gross = quoteSellGross(phantom, curveTokens, collateral)
  if (gross >= debt) {
    return { gross, toUser: gross - debt, shortfall: 0n }
  }
  return { gross, toUser: 0n, shortfall: debt - gross }
}

/**
 * Apply slippage: returns minOut for a given quote and bps tolerance.
 */
export function applySlippage(quote: bigint, slippageBps: bigint): bigint {
  return (quote * (10000n - slippageBps)) / 10000n
}

/**
 * Compute current collateralValue for a position — what it'd sell back for now.
 * collateralValue(T) = phantom − K / (curveTokens + T)
 */
export function collateralValueOf(
  phantom: bigint,
  curveTokens: bigint,
  collateral: bigint
): bigint {
  if (collateral === 0n) return 0n
  const newCurve = curveTokens + collateral
  const newPhantom = K_CONST / newCurve
  if (newPhantom >= phantom) return 0n
  return phantom - newPhantom
}

/**
 * Is this position liquidatable given current pool state?
 */
export function isLiquidatable(
  phantom: bigint,
  curveTokens: bigint,
  collateral: bigint,
  debt: bigint
): boolean {
  const cv = collateralValueOf(phantom, curveTokens, collateral)
  const threshold = (debt * LIQ_THRESHOLD_BPS) / 10000n
  return cv < threshold
}

/**
 * Equity = collateralValue − debt. Negative means underwater.
 */
export function equityOf(
  phantom: bigint,
  curveTokens: bigint,
  collateral: bigint,
  debt: bigint
): bigint {
  const cv = collateralValueOf(phantom, curveTokens, collateral)
  if (cv <= debt) return -(debt - cv)
  return cv - debt
}

/**
 * Format wei as ETH string with given precision.
 */
export function formatEth(wei: bigint, decimals: number = 4): string {
  if (wei === 0n) return '0'
  const neg = wei < 0n
  const abs = neg ? -wei : wei
  const whole = abs / 10n ** 18n
  const frac = abs % 10n ** 18n
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals)
  const trimmed = fracStr.replace(/0+$/, '')
  const sign = neg ? '-' : ''
  return trimmed ? `${sign}${whole}.${trimmed}` : `${sign}${whole}`
}

/**
 * Format spot price as "gwei / RISE" for display.
 * spot is in wei (ETH per RISE, scaled by 1e18 in spotPrice()).
 * That means stored value is wei/rise * 1e18, so dividing by 1e9 gives gwei/rise.
 */
export function formatSpotGwei(spot: bigint): string {
  // spot is wei_per_RISE * 1e18 (over-scaled for precision)
  // wei_per_RISE = spot / 1e18
  // gwei_per_RISE = (spot / 1e18) / 1e9 = spot / 1e27
  const gweiX1000 = (spot * 1000n) / 10n ** 27n
  const whole = gweiX1000 / 1000n
  const frac = gweiX1000 % 1000n
  if (frac === 0n) return whole.toLocaleString()
  return `${whole.toLocaleString()}.${frac.toString().padStart(3, '0').replace(/0+$/, '')}`
}

/**
 * Format wei as RISE with given precision.
 */
export function formatRise(wei: bigint, decimals: number = 2): string {
  return formatEth(wei, decimals)
}

/**
 * Parse user-input ETH string to wei.
 * Returns null on invalid input.
 */
export function parseEth(input: string): bigint | null {
  if (!input || !input.trim()) return null
  const cleaned = input.trim().replace(/,/g, '')
  if (!/^\d*\.?\d*$/.test(cleaned)) return null
  const [whole = '0', frac = ''] = cleaned.split('.')
  const fracPadded = (frac + '000000000000000000').slice(0, 18)
  try {
    return BigInt(whole) * 10n ** 18n + BigInt(fracPadded || '0')
  } catch {
    return null
  }
}
