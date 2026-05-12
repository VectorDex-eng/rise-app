/**
 * Conversions between human price (ETH per RIS3) and Uniswap V4 sqrtPriceX96.
 *
 * Pool convention: currency0 = ETH, currency1 = RIS3.
 *   poolPrice = currency1 / currency0 = RIS3 per ETH
 *   sqrtPriceX96 = sqrt(RIS3perETH) * 2^96
 *
 * When RIS3 dumps → more RIS3 per ETH → poolPrice (and sqrtPriceX96) goes UP.
 * When RIS3 pumps → fewer RIS3 per ETH → poolPrice goes DOWN.
 *
 * Hence in the vault contract:
 *   SL triggers when current ≥ slSqrtPriceX96   (RIS3 cheaper than threshold)
 *   TP triggers when current ≤ tpSqrtPriceX96   (RIS3 more valuable than threshold)
 */

const Q96 = 2n ** 96n

/** sqrtPriceX96 → RIS3 per ETH (as JS number; safe for typical memecoin spot). */
export function sqrtX96ToRis3PerEth(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 === 0n) return 0
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
  return sqrtPrice * sqrtPrice
}

/** sqrtPriceX96 → ETH per RIS3 (inverse). */
export function sqrtX96ToEthPerRis3(sqrtPriceX96: bigint): number {
  const r = sqrtX96ToRis3PerEth(sqrtPriceX96)
  return r > 0 ? 1 / r : 0
}

/** RIS3 per ETH (number) → sqrtPriceX96 (bigint). */
export function ris3PerEthToSqrtX96(ris3PerEth: number): bigint {
  if (!isFinite(ris3PerEth) || ris3PerEth <= 0) return 0n
  // Use Math.sqrt on the float then scale. Loss of bit-precision is acceptable for SL/TP triggers.
  const sqrtPrice = Math.sqrt(ris3PerEth)
  // sqrtPrice * 2^96. Multiply via BigInt: convert sqrtPrice to a 2^48 fixed-point first, then *2^48.
  // sqrtPrice * 2^96 = (sqrtPrice * 2^48) * 2^48
  const scale = 2 ** 48
  const lo = BigInt(Math.floor(sqrtPrice * scale))
  return lo << 48n
}

/** ETH per RIS3 (number) → sqrtPriceX96 (bigint). */
export function ethPerRis3ToSqrtX96(ethPerRis3: number): bigint {
  if (!isFinite(ethPerRis3) || ethPerRis3 <= 0) return 0n
  return ris3PerEthToSqrtX96(1 / ethPerRis3)
}

/**
 * SL trigger from a "drop %" the user is willing to tolerate.
 * dropPct = 30 means: trigger when RIS3 is worth 30% less in ETH.
 * Returns sqrtPriceX96 to pass to vault.open / setTriggers.
 */
export function slSqrtX96FromDropPct(currentEthPerRis3: number, dropPct: number): bigint {
  if (dropPct <= 0 || dropPct >= 100) return 0n
  const slEthPerRis3 = currentEthPerRis3 * (1 - dropPct / 100)
  return ethPerRis3ToSqrtX96(slEthPerRis3)
}

/**
 * TP trigger from a "rise %" the user is targeting.
 * risePct = 100 means: trigger when RIS3 is worth 2× more in ETH.
 */
export function tpSqrtX96FromRisePct(currentEthPerRis3: number, risePct: number): bigint {
  if (risePct <= 0) return 0n
  const tpEthPerRis3 = currentEthPerRis3 * (1 + risePct / 100)
  return ethPerRis3ToSqrtX96(tpEthPerRis3)
}
