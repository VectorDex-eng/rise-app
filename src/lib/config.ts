/**
 * ============================================================
 * ris3 — config (mainnet V10)
 * ============================================================
 * Plain ERC20 token + V4 pool with ETH-fee hook + separate leverage vault.
 * Pool has REAL LP (not virtual). Hook takes 1% in ETH on every swap → vault treasury.
 * Vault provides 2x/3x leverage using treasury ETH for debt funding.
 * ============================================================
 */

import { mainnet } from 'wagmi/chains'

// === V10 deployment addresses ===
export const RIS3_TOKEN_MAINNET   = '0x83143B159bd5788c8E6a791AB72f247f2997C7D3' as const
export const RIS3_VAULT_MAINNET   = '0x2820491Fe21341e9D2CebDCC6199Da6da66A9b4a' as const
export const RIS3_HOOK_MAINNET    = '0x4a37aC7ca998E71204aEc92B4aAeb9da529300Cc' as const

// === Uniswap V4 mainnet infra ===
export const POOL_MANAGER_MAINNET     = '0x000000000004444c5dc75cB358380D2e3dE08A90' as const
export const UNIVERSAL_ROUTER_MAINNET = '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af' as const
export const PERMIT2                  = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const

// === Pool key constants (immutable for this deploy) ===
export const POOL_FEE          = 10_000   // 1% LP fee tier
export const POOL_TICK_SPACING = 60

// === Pool ID = keccak256(abi.encode(currency0, currency1, fee, tickSpacing, hooks)) ===
// Computed off-chain for the V10 pool.
export const POOL_ID_MAINNET = '0x2a593234e5f297f2c994eb49cc2c735bfafcc0b5e8052e8ad333ea22c51ccfa9' as const

// === Network ===
export const DEFAULT_CHAIN_ID: number = mainnet.id
export const SUPPORTED_CHAINS = [mainnet] as const

// === Protocol constants (must match deployed vault) ===
export const TOTAL_SUPPLY        = 1_000_000n * 10n ** 18n
export const LIQ_THRESHOLD_BPS   = 15000n   // 1.5× debt (V10)
export const OPEN_FEE_BPS        = 50n      // 0.5% open fee on leveraged size
export const HOOK_FEE_BPS        = 100n     // 1% ETH skim from every swap
export const LP_FEE_BPS          = 100n     // 1% LP fee (V4 pool fee tier)
export const MIN_POSITION_ETH    = 5n * 10n ** 16n   // 0.05 Ξ
export const LEVERAGE_TIERS      = [2, 3] as const
export const BOUNTY_BPS          = 100n     // 1%
export const BOUNTY_CAP          = 10n ** 16n  // 0.01 Ξ

// === Slippage defaults (bps) ===
export const DEFAULT_SLIPPAGE_BPS = 200n     // 2%
export const SLIPPAGE_PRESETS     = [100n, 200n, 500n]

// === Safety constants ===
export const GAS_RESERVE_WEI   = 2n * 10n ** 15n   // 0.002 Ξ
export const MIN_TRADE_ETH_WEI = 10n ** 16n        // 0.01 Ξ

// === RPC ===
export const RPC_MAINNET = 'https://ethereum-rpc.publicnode.com'

// === WalletConnect ===
export const WALLETCONNECT_PROJECT_ID = ''

// === Token metadata ===
export const TOKEN_SYMBOL = '$RIS3'
export const TOKEN_DECIMALS = 18

// === Per-chain helpers (mainnet only, arity preserved for forward-compat) ===
export function ris3TokenFor(_chainId: number): `0x${string}` {
  return RIS3_TOKEN_MAINNET
}
export function ris3VaultFor(_chainId: number): `0x${string}` {
  return RIS3_VAULT_MAINNET
}
export function ris3HookFor(_chainId: number): `0x${string}` {
  return RIS3_HOOK_MAINNET
}
export function poolManagerFor(_chainId: number): `0x${string}` {
  return POOL_MANAGER_MAINNET
}
export function universalRouterFor(_chainId: number): `0x${string}` {
  return UNIVERSAL_ROUTER_MAINNET
}
export function chainName(_chainId: number): string {
  return 'ethereum'
}
export function isConfigured(_chainId: number): boolean {
  return (RIS3_TOKEN_MAINNET as string) !== '0x0000000000000000000000000000000000000000'
}

// Legacy curve params (now zero — pool no longer uses virtual reserves)
export const V_ETH = 0n
export const K_CONST = 0n

// === Legacy aliases (TODO: clean up callers) ===
export const HOOK_ADDRESS_MAINNET = RIS3_HOOK_MAINNET
export const RISE_TOKEN_ADDRESS_MAINNET = RIS3_TOKEN_MAINNET
export const hookAddressFor = ris3HookFor
export const riseTokenAddressFor = ris3TokenFor
export const isHookConfigured = isConfigured
