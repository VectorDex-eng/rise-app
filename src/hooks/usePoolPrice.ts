import { useReadContract } from 'wagmi'
import { keccak256, encodePacked, type Hex } from 'viem'
import { POOL_MANAGER_MAINNET, POOL_ID_MAINNET, DEFAULT_CHAIN_ID } from '../lib/config'

/**
 * Computes the storage slot for `pools[poolId].slot0` in V4 PoolManager.
 *   pools mapping is at storage slot 6.
 *   slot = keccak256(abi.encodePacked(poolId, uint256(6)))
 */
function poolStateSlot(poolId: Hex): Hex {
  return keccak256(encodePacked(['bytes32', 'uint256'], [poolId, 6n]))
}

/**
 * Decode slot0 packed data (returned by extsload):
 *   bits   0-159: sqrtPriceX96 (uint160)
 *   bits 160-183: tick (int24, signed)
 *   bits 184-207: protocolFee (uint24)
 *   bits 208-231: lpFee (uint24)
 */
function decodeSlot0(data: Hex): { sqrtPriceX96: bigint; tick: number } {
  const raw = BigInt(data)
  const sqrtPriceX96 = raw & ((1n << 160n) - 1n)
  let tick = Number((raw >> 160n) & ((1n << 24n) - 1n))
  // sign-extend 24-bit two's complement
  if (tick >= 0x800000) tick -= 0x1000000
  return { sqrtPriceX96, tick }
}

const POOL_MANAGER_ABI = [{
  type: 'function',
  name: 'extsload',
  stateMutability: 'view',
  inputs: [{ name: 'slot', type: 'bytes32' }],
  outputs: [{ type: 'bytes32' }],
}] as const

/**
 * usePoolPrice — live spot price of the ris3/ETH pool.
 *
 * Returns sqrtPriceX96 + tick + ethPerRis3 (a JS number — small enough since spot is ~$0.03
 * = ~1e-5 Ξ per ris3, well within JS precision for display).
 *
 * Polls every 8 seconds.
 */
export function usePoolPrice(chainId: number = DEFAULT_CHAIN_ID) {
  const slot = poolStateSlot(POOL_ID_MAINNET)

  const { data, isLoading, error } = useReadContract({
    address: POOL_MANAGER_MAINNET,
    abi: POOL_MANAGER_ABI,
    functionName: 'extsload',
    args: [slot],
    chainId,
    query: { refetchInterval: 8_000 },
  })

  if (!data) {
    return {
      sqrtPriceX96: 0n,
      tick: 0,
      ethPerRis3: 0,
      ris3PerEth: 0,
      isLoading,
      error,
      ready: false,
    }
  }

  const { sqrtPriceX96, tick } = decodeSlot0(data as Hex)

  // Pool price = (sqrtPriceX96 / 2^96)^2 = ris3/ETH (since currency0=ETH, currency1=ris3).
  // Compute in JS float: safe for typical memecoin spot values.
  if (sqrtPriceX96 === 0n) {
    return { sqrtPriceX96: 0n, tick: 0, ethPerRis3: 0, ris3PerEth: 0, isLoading, error, ready: false }
  }

  // sqrtPrice / 2^96 → JS number. For ris3 launch ~10,000 ris3/ETH, sqrtPrice ≈ 100.
  const sqrtPrice = Number(sqrtPriceX96) / Number(1n << 96n)
  const ris3PerEth = sqrtPrice * sqrtPrice          // price = currency1/currency0 = ris3/ETH
  const ethPerRis3 = ris3PerEth > 0 ? 1 / ris3PerEth : 0

  return {
    sqrtPriceX96,
    tick,
    ethPerRis3,    // how much ETH 1 ris3 is worth — multiply by collateral_ris3 / 1e18 to get ETH value
    ris3PerEth,
    isLoading,
    error,
    ready: true,
  }
}
