/**
   * ============================================================
   * RISE — config
   * ============================================================
   *
   * UPDATE THIS FILE when v1.1 redeploys to Sepolia / mainnet.
   *
   * The widget loads addresses from here. Nothing else hardcodes them.
   *
   *   1. After Sepolia v1.1 redeploy: set HOOK_ADDRESS_SEPOLIA and POOL_ID_SEPOLIA  [done — 2026-05-11]
   *   2. After mainnet deploy:        set HOOK_ADDRESS_MAINNET, POOL_ID_MAINNET, FEE_RECIPIENT_MAINNET
   *
   * To switch which network the app targets, change DEFAULT_CHAIN_ID below.
   * ============================================================
   */

  import { mainnet, sepolia } from 'wagmi/chains'
  
  // === addresses ===
  // Hook contract — Sepolia v1.1 deployed 2026-05-11 (commit a3e8e38; audit fixes + fee withdraw)
  export const HOOK_ADDRESS_SEPOLIA = '0xb31E487C94672a0d04b091B1dAcf54c443336A88' as const
  export const HOOK_ADDRESS_MAINNET = '0x0000000000000000000000000000000000000000' as const

  // Pool ID — bytes32 — set after deploy
  export const POOL_ID_SEPOLIA = '0xd9c5403d21ecea45efc6573a3ac72711ee3f428bd9ce57c44834f987ca233d94' as const
  export const POOL_ID_MAINNET = '0x0000000000000000000000000000000000000000000000000000000000000000' as const

  // PoolKey constants — needed to build the full PoolKey struct for swap routing.
  // Hook uses fee=10000 (= 1.00% LP fee tier) + tickSpacing=60. Same on every chain.
  export const POOL_FEE = 10_000               // uint24, "1%" tier
  export const POOL_TICK_SPACING = 60          // int24

  // Uniswap V4 verified addresses
  export const POOL_MANAGER_SEPOLIA = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as const
  export const POOL_MANAGER_MAINNET = '0x000000000004444c5dc75cB358380D2e3dE08A90' as const
  export const UNIVERSAL_ROUTER_SEPOLIA = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b' as const

  // Fee recipient — the address that may call withdrawProtocolFees() and receives the funds.
  // Immutable per-deploy (baked into the salt). Sepolia is the deployer wallet for now.
  // Mainnet TBD — pick a real treasury / multisig before mainnet deploy.
  export const FEE_RECIPIENT_SEPOLIA = '0x1D24BfDaeDB88E05c94ea1f25f9Bbe971525B924' as const
  export const FEE_RECIPIENT_MAINNET = '0x0000000000000000000000000000000000000000' as const

  // === network ===
  export const DEFAULT_CHAIN_ID: number = sepolia.id // change to mainnet.id after mainnet deploy
  export const SUPPORTED_CHAINS = [sepolia, mainnet] as const

  // === protocol constants (immutable, match contract) ===
  export const V_ETH = 20n * 10n ** 18n            // virtual ETH reserve
  export const TOTAL_SUPPLY = 1_000_000n * 10n ** 18n
  export const K_CONST = V_ETH * TOTAL_SUPPLY     // 2e43
  export const LIQ_THRESHOLD_BPS = 13000n          // 1.3x debt — value < debt * 1.3 triggers
  export const SWAP_FEE_BPS = 50n                  // 0.50%
  export const GLOBAL_DEBT_CAP_BPS = 4000n         // 40% of realETH + V
  export const MIN_POSITION = 5n * 10n ** 16n      // 0.05 ETH
  export const LEVERAGE_TIERS = [2, 3] as const
  export const BOUNTY_BPS = 100n                   // 1%
  export const BOUNTY_CAP = 10n ** 16n             // 0.01 ETH

  // === slippage defaults (in bps) ===
  export const DEFAULT_SLIPPAGE_BPS = 100n         // 1%
  export const SLIPPAGE_PRESETS = [50n, 100n, 200n] // 0.5%, 1%, 2%
  
  // === RPC ===
  // Use any public Sepolia RPC. publicnode is free, no API key required.
  // For production, point at Alchemy / Infura with your own API key.
  export const RPC_SEPOLIA = 'https://ethereum-sepolia-rpc.publicnode.com'
  export const RPC_MAINNET = 'https://ethereum-rpc.publicnode.com'
  
  // === WalletConnect ===
  // Get a free project ID at https://cloud.walletconnect.com
  // Without one, WalletConnect mobile wallets won't work — only injected wallets (MetaMask, Rabby browser extensions, etc.)
  export const WALLETCONNECT_PROJECT_ID = ''
  
  // === Token metadata ===
  export const TOKEN_SYMBOL = '$RISE'
  export const TOKEN_DECIMALS = 18

  // === resolved per-chain helpers ===
  export function hookAddressFor(chainId: number): `0x${string}` {
    if (chainId === sepolia.id) return HOOK_ADDRESS_SEPOLIA
    if (chainId === mainnet.id) return HOOK_ADDRESS_MAINNET
    return HOOK_ADDRESS_SEPOLIA
  }
  
  export function poolManagerFor(chainId: number): `0x${string}` {
    if (chainId === sepolia.id) return POOL_MANAGER_SEPOLIA
    if (chainId === mainnet.id) return POOL_MANAGER_MAINNET
    return POOL_MANAGER_SEPOLIA
  }
  
  export function poolIdFor(chainId: number): `0x${string}` {
    if (chainId === sepolia.id) return POOL_ID_SEPOLIA
    if (chainId === mainnet.id) return POOL_ID_MAINNET
    return POOL_ID_SEPOLIA
  }
  
  export function feeRecipientFor(chainId: number): `0x${string}` {
    if (chainId === sepolia.id) return FEE_RECIPIENT_SEPOLIA
    if (chainId === mainnet.id) return FEE_RECIPIENT_MAINNET
    return FEE_RECIPIENT_SEPOLIA
  }
  
  export function chainName(chainId: number): string {
    if (chainId === sepolia.id) return 'sepolia'
    if (chainId === mainnet.id) return 'ethereum'
    return 'unknown'
  }

  export function isHookConfigured(chainId: number): boolean {
    const addr = hookAddressFor(chainId)
    return addr !== '0x0000000000000000000000000000000000000000'
  }
export const RISE_TOKEN_ADDRESS_SEPOLIA = '0x8C5664B9d422Aafe642A3F9cEA5849a5975bA39d' as const

export const POOL_SWAP_TEST_SEPOLIA = '0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe' as const
