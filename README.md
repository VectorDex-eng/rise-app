# $RIS3 — frontend

Vite + React 18 + TypeScript + ConnectKit + wagmi 2 + viem 2.

Marketing site + trade widget. Widget connects via ConnectKit (MetaMask, WalletConnect, Coinbase Wallet, Rabby, ~300 wallets). Reads pool state live via wagmi `useReadContract`. Writes via `useWriteContract`.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # outputs dist/
npm run preview      # serve the build locally
```

---

## Files you'll touch (in this order)

### 1. `src/lib/config.ts` — POST-DEPLOY

After v1.1 redeploys to Sepolia:

```ts
export const HOOK_ADDRESS_SEPOLIA = '0x...'   // ← paste real address
export const POOL_ID_SEPOLIA = '0x...'        // ← paste pool ID (bytes32)
```

After mainnet deploy:

```ts
export const HOOK_ADDRESS_MAINNET = '0x...'
export const POOL_ID_MAINNET = '0x...'
export const DEFAULT_CHAIN_ID: number = mainnet.id   // ← flip target chain
```

### 2. `src/abi/Ris3LeverageHook.ts` — POST-DEPLOY

The current ABI is a **placeholder** derived from the spec. After redeploy, replace with the real Foundry-generated ABI:

```bash
# on VPS, in /root/ris3
forge inspect Ris3LeverageHook abi > /tmp/hook-abi.json
cat /tmp/hook-abi.json
```

Then replace the array in `src/abi/Ris3LeverageHook.ts` with the JSON output. Keep the `export const ris3HookAbi = [...] as const` wrapper.

### 3. `src/lib/config.ts` → `WALLETCONNECT_PROJECT_ID` — OPTIONAL

Get a free project ID from <https://cloud.walletconnect.com> and paste it here. Without one, mobile wallets via WalletConnect won't work — only injected browser extension wallets (MetaMask, Rabby, etc.).

---

## Architecture

```
src/
├── App.tsx                        # composes the marketing site + widget
├── main.tsx                       # WagmiProvider + ConnectKit setup
│
├── lib/
│   ├── config.ts                  # ADDRESSES + PROTOCOL CONSTANTS — edit here post-deploy
│   ├── wagmi.ts                   # wagmi config (chains, transports, walletconnect)
│   └── curve.ts                   # mirrors on-chain math for UI quotes
│
├── abi/
│   └── Ris3LeverageHook.ts        # PLACEHOLDER — replace with real ABI after redeploy
│
├── hooks/
│   ├── usePoolState.ts            # reads realETH, totalDebt, curveTokens, etc. (polls 12s)
│   └── useUserPositions.ts        # reads positionsOf(owner) + positions(id) for each
│
├── components/
│   ├── TradeWidget.tsx            # the 4-tab widget (Mint / Burn / Open / Positions)
│   ├── TopBar.tsx                 # navbar + ConnectKit button
│   ├── TickerStrip.tsx            # animated top ticker with live pool data
│   ├── Banner.tsx                 # audit status banner
│   ├── ContractBar.tsx            # contract address display
│   ├── Footer.tsx                 # footer
│   └── sections/                  # marketing sections (Mechanism, KInvariant, Cascade, etc.)
│
└── styles/
    ├── globals.css                # site-wide styles (lifted from v4 static site)
    └── widget.css                 # widget-specific styles
```

---

## What's wired

### Read paths — all functional once `HOOK_ADDRESS_SEPOLIA` is set

- `realETH`, `totalDebt`, `curveTokens`, `redemptionTokens`, `liquidationDeficit`, `protocolFees`, `nextPositionId` (TickerStrip + widget body)
- `positionsOf(owner)` + `positions(id)` for each (Positions tab)
- Derived: `phantom_eth`, `spotPrice`, `debtCap`, `debtHeadroom`, `collateralValue`, `equity`, `isLiquidatable` (computed client-side in `lib/curve.ts`, mirrors contract math exactly)

### Write paths — wired but require verification

- **`openPosition(leverage, minCollateral)` payable** — Open tab. Wired directly to the hook. ✓
- **`closePosition(id, minProceeds)`** — Positions tab close button. Wired directly. ✓
- **Mint (unleveraged buy)** — currently calls `openPosition(1, minOut)` as a placeholder. **In V4 this should route through Universal Router** (`0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b` on Sepolia) which calls into the hook via `swap()`. Update before mainnet.
- **Burn (unleveraged sell)** — same placeholder. Needs Universal Router routing.

The mint/burn paths are **the biggest remaining wire-in**. The widget will work for leveraged opens/closes immediately after the address is dropped in. For the basic swap (mint/burn), follow Uniswap V4 docs on Universal Router swap calldata encoding.

---

## Deploy

Static build. Drop `dist/` on any host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront, plain nginx).

```bash
npm run build
# → outputs static site to dist/
```

For Cloudflare Pages: `npm run build`, output directory `dist`, no build env required.

---

## Trade widget — design notes

**Quote engine (`lib/curve.ts`) mirrors contract math.** Every quote shown is a client-side computation against the live pool state — no extra RPC per keystroke. The user sees a number that matches what the contract will compute, modulo slippage tolerance applied via `minCollateral` / `minProceeds`.

**Slippage protection.** Every write call passes a min-out derived from quote × (1 − slippage). Default 1%, presets 0.5 / 1 / 2 %. Same defense pattern as Uniswap.

**Same-block guard.** Hook rejects liquidation of positions opened in the same block. Frontend doesn't need to enforce this; contract reverts protect the user.

**Network mismatch.** Widget detects wrong chain and prompts switch. Won't enable submit until on the configured chain.

**Unconfigured state.** Until `HOOK_ADDRESS_SEPOLIA` is set, the widget loads with a "v1.1 not yet deployed" banner. UI fully visible. Read calls disabled. Write calls disabled.

---

## Known stub spots (search code for `PLACEHOLDER`)

- `src/abi/Ris3LeverageHook.ts` — full ABI is placeholder, replace post-deploy
- `src/components/TradeWidget.tsx` — mint/burn tabs use openPosition/closePosition as stand-ins; route through Universal Router for real basic swaps
- `src/components/TradeWidget.tsx` BurnTab — `ris3Balance = 0n` (hardcoded). Wire to ERC-6909 `balanceOf(address, tokenId)` against PoolManager once token ID is known.
- `src/lib/config.ts` — `WALLETCONNECT_PROJECT_ID = ''` empty; works without it (injected wallets only)

---

## License

UNLICENSED. Internal build. Not for redistribution until v1 is shipped.
