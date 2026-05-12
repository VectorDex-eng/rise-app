/**
 * ============================================================
 * ris3 — config (mainnet)
 * ============================================================
 * The widget loads addresses from here. Nothing else hardcodes them.
 * ============================================================
 */

import { mainnet } from 'wagmi/chains'

// === addresses ===
// Hook contract — mainnet CREATE2 (salt 0x3f84, deployer nonce 0). Live after broadcast.
export const HOOK_ADDRESS_MAINNET = '0x336E1E95f7B9d3C33fF9075611D8326bC549Aa88' as const

// ris3 token CA — CREATE (Bootstrap nonce 1). Live after broadcast.
export const RISE_TOKEN_ADDRESS_MAINNET = '0x381560C1414Cd7DDb0C9fde646d0B46ab8E1eC03' as const

// Pool ID = keccak256(abi.encode(0x0, RIS3, 10000, 60, HOOK))
export const POOL_ID_MAINNET = '0x188bba6f9b3f8268337edd2216801412a49d30c902e024a0ab2f217e579ef4c5' as const

// PoolKey constants — needed to build the full PoolKey struct for swap routing.
export const POOL_FEE = 10_000               // uint24, "1%" tier
export const POOL_TICK_SPACING = 60          // int24

// Uniswap V4 mainnet infrastructure
export const POOL_MANAGER_MAINNET = '0x000000000004444c5dc75cB358380D2e3dE08A90' as const
export const UNIVERSAL_ROUTER_MAINNET = '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af' as const
// Permit2 — canonical singleton, same address on every chain.
export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const

// Fee recipient — baked into the hook salt, may call withdrawProtocolFees().
export const FEE_RECIPIENT_MAINNET = '0x9AD132BaC31d2E198103a6899de371C008B2CE57' as const

// === network ===
export const DEFAULT_CHAIN_ID: number = mainnet.id
export const SUPPORTED_CHAINS = [mainnet] as const

// === protocol constants (immutable, match contract) ===
export const V_ETH = 10n * 10n ** 18n            // virtual ETH reserve
export const TOTAL_SUPPLY = 1_000_000n * 10n ** 18n
export const K_CONST = V_ETH * TOTAL_SUPPLY     // 1e43
export const LIQ_THRESHOLD_BPS = 13000n          // 1.3x debt — value < debt * 1.3 triggers
export const SWAP_FEE_BPS = 50n                  // 0.50%
export const GLOBAL_DEBT_CAP_BPS = 4000n         // 40% of realETH + V
export const MIN_POSITION = 5n * 10n ** 16n      // 0.05 ETH
export const LEVERAGE_TIERS = [2, 3] as const
export const BOUNTY_BPS = 100n                   // 1%
export const BOUNTY_CAP = 10n ** 16n             // 0.01 ETH

// === slippage defaults (in bps) ===
export const DEFAULT_SLIPPAGE_BPS = 200n         // 2%
export const SLIPPAGE_PRESETS = [100n, 200n, 500n] // 1%, 2%, 5%

// === safety constants (mirror contract, used by frontend pre-checks) ===
export const GAS_RESERVE_WEI = 2n * 10n ** 15n   // ~0.002 ETH covers up to ~200 gwei × 1M gas
export const MIN_TRADE_ETH_WEI = 10n ** 16n      // 0.01 ETH

// === RPC ===
export const RPC_MAINNET = 'https://ethereum-rpc.publicnode.com'

// === WalletConnect ===
// Get a free project ID at https://cloud.walletconnect.com
// Without one, WalletConnect mobile wallets won't work — only injected wallets (MetaMask, Rabby etc.)
export const WALLETCONNECT_PROJECT_ID = ''

// === Token metadata ===
export const TOKEN_SYMBOL = '$RIS3'
export const TOKEN_DECIMALS = 18

// === resolved per-chain helpers (mainnet-only, but keep arity for forward-compat) ===
export function hookAddressFor(_chainId: number): `0x${string}` {
  return HOOK_ADDRESS_MAINNET
}

export function poolManagerFor(_chainId: number): `0x${string}` {
  return POOL_MANAGER_MAINNET
}

export function poolIdFor(_chainId: number): `0x${string}` {
  return POOL_ID_MAINNET
}

export function feeRecipientFor(_chainId: number): `0x${string}` {
  return FEE_RECIPIENT_MAINNET
}

export function riseTokenAddressFor(_chainId: number): `0x${string}` {
  return RISE_TOKEN_ADDRESS_MAINNET
}

export function universalRouterFor(_chainId: number): `0x${string}` {
  return UNIVERSAL_ROUTER_MAINNET
}

export function chainName(_chainId: number): string {
  return 'ethereum'
}

export function isHookConfigured(_chainId: number): boolean {
  return (HOOK_ADDRESS_MAINNET as string) !== '0x0000000000000000000000000000000000000000'
}
