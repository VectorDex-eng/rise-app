/**
 * Encodes Uniswap V4 swap calls for the Universal Router.
 *
 * Universal Router takes (commands, inputs, deadline). For a pool swap we use:
 *   commands = 0x10 (V4_SWAP)
 *   inputs[0] = abi.encode(actions, params) where:
 *     actions = packed bytes1[] of v4-router action ids
 *     params  = bytes[] - one entry per action, abi-encoded
 *
 * Action ids (from v4-periphery/src/libraries/Actions.sol):
 *   SWAP_EXACT_IN_SINGLE = 0x06
 *   SETTLE_ALL           = 0x0c
 *   TAKE_ALL             = 0x0f
 *
 * Pattern used here for a single-hop exact-in swap:
 *   [SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL]
 */

import { encodeAbiParameters, parseAbiParameters } from 'viem'
import {
  POOL_FEE, POOL_TICK_SPACING,
  hookAddressFor, riseTokenAddressFor,
} from './config'

const ETH_ADDR = '0x0000000000000000000000000000000000000000' as const

const ACTION_SWAP_EXACT_IN_SINGLE = 0x06
const ACTION_SETTLE_ALL           = 0x0c
const ACTION_TAKE_ALL             = 0x0f

const COMMAND_V4_SWAP = 0x10

/**
 * Pack a sequence of action ids into a single bytes value.
 *  [0x06, 0x0c, 0x0f] → 0x060c0f
 */
function packActions(actions: number[]): `0x${string}` {
  return ('0x' + actions.map(a => a.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

/**
 * Build the PoolKey + ExactInputSingleParams + SETTLE/TAKE args for an exact-in single swap.
 *
 * @param chainId      target chain
 * @param zeroForOne   true = ETH→RIS3 (mint), false = RIS3→ETH (burn)
 * @param amountIn     exact input amount (wei or 1e18 RIS3 units)
 * @param amountOutMin slippage floor
 */
export function encodeV4SwapExactIn(args: {
  chainId: number
  zeroForOne: boolean
  amountIn: bigint
  amountOutMin: bigint
}): { commands: `0x${string}`; inputs: `0x${string}`[] } {
  const { chainId, zeroForOne, amountIn, amountOutMin } = args

  const ris3 = riseTokenAddressFor(chainId)
  const hook = hookAddressFor(chainId)

  // PoolKey — currency0 < currency1 (ETH=0x0 is always currency0).
  const poolKey = {
    currency0: ETH_ADDR,
    currency1: ris3,
    fee: POOL_FEE,
    tickSpacing: POOL_TICK_SPACING,
    hooks: hook,
  } as const

  // (currency to settle, currency to take) — derived from swap direction.
  const settleCurrency = zeroForOne ? ETH_ADDR : ris3
  const takeCurrency   = zeroForOne ? ris3      : ETH_ADDR

  const actions = packActions([ACTION_SWAP_EXACT_IN_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL])

  // params[0] = ExactInputSingleParams (struct)
  const swapParam = encodeAbiParameters(
    parseAbiParameters('((address,address,uint24,int24,address),bool,uint128,uint128,bytes)'),
    [[
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      zeroForOne,
      amountIn,
      amountOutMin,
      '0x',
    ]] as any
  )

  // params[1] = SETTLE_ALL(currency, maxAmount). maxAmount is the upper bound the router
  // is willing to settle — pin to exact amountIn so any overshoot reverts.
  const settleParam = encodeAbiParameters(
    parseAbiParameters('address, uint256'),
    [settleCurrency, amountIn]
  )

  // params[2] = TAKE_ALL(currency, minAmount). minAmount is the slippage floor — UR reverts
  // if the actual output delta is less than this.
  const takeParam = encodeAbiParameters(
    parseAbiParameters('address, uint256'),
    [takeCurrency, amountOutMin]
  )

  // V4_SWAP input = abi.encode(actions, params[])
  const v4SwapInput = encodeAbiParameters(
    parseAbiParameters('bytes, bytes[]'),
    [actions, [swapParam, settleParam, takeParam]]
  )

  const commands = ('0x' + COMMAND_V4_SWAP.toString(16).padStart(2, '0')) as `0x${string}`
  return { commands, inputs: [v4SwapInput] }
}

/**
 * Compute a deadline timestamp `seconds` into the future.
 */
export function swapDeadline(seconds: number = 180): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds)
}
