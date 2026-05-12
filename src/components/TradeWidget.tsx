import { useState, useMemo, useEffect } from 'react'
import {
  useAccount, useBalance, useChainId, useReadContract, useWatchAsset,
  useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useBlockNumber,
} from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { ris3TokenAbi } from '../abi/Ris3Token'
import { ris3VaultAbi } from '../abi/Ris3Vault'
import { universalRouterAbi } from '../abi/UniversalRouter'
import { permit2Abi } from '../abi/Permit2'
import {
  ris3HookFor, ris3VaultFor, ris3TokenFor, isConfigured, chainName, DEFAULT_CHAIN_ID,
  SLIPPAGE_PRESETS, DEFAULT_SLIPPAGE_BPS, MIN_POSITION_ETH, LEVERAGE_TIERS,
  universalRouterFor, PERMIT2, TOTAL_SUPPLY,
  GAS_RESERVE_WEI, MIN_TRADE_ETH_WEI,
  // Legacy aliases kept for compatibility
  hookAddressFor, isHookConfigured, riseTokenAddressFor,
} from '../lib/config'
import { encodeV4SwapExactIn, swapDeadline } from '../lib/v4SwapEncoder'
import { applySlippage, formatEth, formatRise, parseEth } from '../lib/curve'
import { usePoolState } from '../hooks/usePoolState'
import { usePoolPrice } from '../hooks/usePoolPrice'
import { useUserPositions } from '../hooks/useUserPositions'
import {
  slSqrtX96FromDropPct, tpSqrtX96FromRisePct,
  sqrtX96ToEthPerRis3,
} from '../lib/priceMath'
import '../styles/widget.css'

// Legacy alias to avoid changes throughout the file
const MIN_POSITION = MIN_POSITION_ETH
// Stub functions for old curve-based quotes — return 0 since new pool follows standard V4 math.
// Frontend now defers to DEXScreener for displayed price; on-chain slippage params guard trades.
const quoteBuyGross  = (_p: bigint, _c: bigint, _e: bigint) => 0n
const quoteSellGross = (_p: bigint, _c: bigint, _e: bigint) => 0n
const quoteOpen      = (_p: bigint, _c: bigint, _e: bigint, _l: number) => ({
  collateral: 0n, debt: 0n, leveragedSize: 0n, curveImpact: 0n, fee: 0n, postSpot: 0n,
  liquidationCv: 0n,
})
const quoteClose     = (_p: bigint, _c: bigint, _coll: bigint, _debt: bigint) => ({
  proceeds: 0n, toUser: 0n,
})
const applyFee = (gross: bigint) => (gross * 9950n) / 10000n
const collateralValueOf = (..._args: bigint[]) => 0n
const equityOf  = (..._args: bigint[]) => 0n
const isLiquidatable = (..._args: bigint[]) => false
// Format helper kept from old curve.ts API
const TOKEN_DECIMALS = 18n

type Tab = 'mint' | 'burn' | 'open' | 'close'

// ─────────────────────────────────────────────────────────────
// formatters
// ─────────────────────────────────────────────────────────────

/// Format the contract's spot price (= phantomEth × 1e18 / curveTokens) as ETH/RISE.
/// Uses bigint integer math to avoid Number() precision loss at large supply states.
function formatSpotEthPerRise(spot: bigint): string {
  if (spot === 0n) return '—'
  // Want: spot / 1e18 in ETH/RISE.
  // Express as fixed-point with 18 fractional digits.
  const whole = spot / 10n ** 18n
  const frac  = spot % 10n ** 18n
  if (whole > 0n) {
    // ≥ 1 ETH/RISE → safe for Number()
    const num = Number(whole) + Number(frac) / 1e18
    return num >= 100 ? num.toFixed(2) : num.toFixed(4)
  }
  // < 1 ETH/RISE — render as fixed scientific. Find the leading non-zero digit.
  const fracStr = frac.toString().padStart(18, '0')
  let lead = 0
  while (lead < fracStr.length && fracStr[lead] === '0') lead++
  if (lead >= 17) return '—'
  // mantissa = three significant digits starting at `lead`
  const digits = fracStr.slice(lead, lead + 4).padEnd(4, '0')
  const exp    = -(lead + 1)
  const mant   = `${digits[0]}.${digits.slice(1, 4)}`
  return `${mant}e${exp}`
}

function formatEthShort(wei: bigint): string {
  return formatEth(wei, 3)
}

function addRise(watchAsset: ReturnType<typeof useWatchAsset>['watchAsset'], tokenAddr: `0x${string}`) {
  watchAsset({ type: 'ERC20', options: { address: tokenAddr, symbol: 'RIS3', decimals: 18 } })
}

/// Treat user-rejected wallet prompts differently from chain reverts.
function isUserRejection(err: any): boolean {
  if (!err) return false
  const name = (err as { name?: string }).name
  return name === 'UserRejectedRequestError'
    || name === 'TransactionExecutionError' && /rejected|denied/i.test(err.message || '')
    || /user rejected|user denied|cancelled/i.test(err?.shortMessage || err?.message || '')
}

/// MAX button helper — subtract gas reserve to avoid "insufficient funds for gas".
function applyMaxWithGasReserve(balance: bigint | undefined): string {
  if (!balance) return ''
  const usable = balance > GAS_RESERVE_WEI ? balance - GAS_RESERVE_WEI : 0n
  return formatEth(usable, 6)
}

// ─────────────────────────────────────────────────────────────
// root
// ─────────────────────────────────────────────────────────────
export function TradeWidget() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const targetChainId = DEFAULT_CHAIN_ID
  const wrongNetwork = isConnected && chainId !== targetChainId

  const pool = usePoolState(targetChainId)
  const { positions } = useUserPositions(address, targetChainId)
  const configured = isHookConfigured(targetChainId)

  // Block-number tick — used for same-block close disable in Positions tab.
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: targetChainId })

  const [tab, setTab] = useState<Tab>('mint')
  const [slippage, setSlippage] = useState<bigint>(DEFAULT_SLIPPAGE_BPS)

  // ── keyboard shortcuts: m/b/o/p ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'm' || e.key === 'M') setTab('mint')
      else if (e.key === 'b' || e.key === 'B') setTab('burn')
      else if (e.key === 'o' || e.key === 'O') setTab('open')
      else if (e.key === 'p' || e.key === 'P') setTab('close')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── live stats: PRICE / FDV / TVL / POSITIONS ──
  const stats = useMemo(() => {
    const price = formatSpotEthPerRise(pool.spot)
    // spot units: ethWei × 1e18 / riseWei. TOTAL_SUPPLY is in riseWei. Product /1e18 = ethWei.
    const fdvWei = (TOTAL_SUPPLY * pool.spot) / 10n ** 18n
    return { price, fdvWei, tvlEth: pool.realETH, openCt: positions.length }
  }, [pool.spot, pool.realETH, positions.length])

  const tabCommon = {
    pool, address: address!, slippage, setSlippage,
    configured, disabled: wrongNetwork || !configured,
    chainId: targetChainId,
  }

  return (
    <div className="widget" role="region" aria-label="RIS3 trade widget">
      <div className="widget-head">
        <div className="widget-pair">
          RIS3 <span className="slash">/</span> ETH
        </div>
        <span className={`widget-live ${configured ? '' : 'off'}`}>
          {configured ? `live · ${chainName(targetChainId)}` : `${chainName(targetChainId)} · not deployed`}
        </span>
      </div>

      <div className="widget-stats">
        <div className="st"><span className="st-k">treasury</span><span className="st-v">{formatEthShort(pool.treasuryEth)} Ξ</span></div>
        <div className="st"><span className="st-k">debt</span><span className="st-v">{formatEthShort(pool.totalDebt)} Ξ</span></div>
        <div className="st"><span className="st-k">available</span><span className="st-v">{formatEthShort(pool.availableTreasury)} Ξ</span></div>
        <div className="st"><span className="st-k">your pos</span><span className="st-v">{stats.openCt}</span></div>
      </div>

      <div className="widget-tabs" role="tablist">
        <button role="tab" className={`widget-tab ${tab === 'mint' ? 'active' : ''}`}  onClick={() => setTab('mint')}>Buy</button>
        <button role="tab" className={`widget-tab ${tab === 'burn' ? 'active' : ''}`}  onClick={() => setTab('burn')}>Sell</button>
        <button role="tab" className={`widget-tab ${tab === 'open' ? 'active' : ''}`}  onClick={() => setTab('open')}>Open</button>
        <button role="tab" className={`widget-tab ${tab === 'close' ? 'active' : ''}`} onClick={() => setTab('close')}>Pos</button>
      </div>

      <div className="widget-body">
        {!configured && (
          <div className="stub-warning">
            <strong>not deployed</strong>
            <code>HOOK_ADDRESS</code>
          </div>
        )}

        {wrongNetwork && (
          <div className="net-warning">
            wrong network · chain {chainId}
            <button onClick={() => switchChain({ chainId: targetChainId })}>switch</button>
          </div>
        )}

        {!isConnected ? (
          <ConnectPrompt />
        ) : tab === 'mint' ? (
          <MintTab {...tabCommon} />
        ) : tab === 'burn' ? (
          <BurnTab {...tabCommon} />
        ) : tab === 'open' ? (
          <OpenTab {...tabCommon} />
        ) : (
          <PositionsTab {...tabCommon} blockNumber={blockNumber} />
        )}
      </div>

      <div className="widget-foot">
        <span>fee 2% · slip {Number(slippage) / 100}%</span>
        <span className="kbd-hints">
          <kbd>M</kbd><kbd>B</kbd><kbd>O</kbd><kbd>P</kbd>
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// connect prompt — points users to the topbar (single connect surface)
// ─────────────────────────────────────────────────────────────
function ConnectPrompt() {
  return (
    <div className="connect-prompt">
      <div className="ttl">[ WALLET REQUIRED ]</div>
      <div className="sub">connect via top-right ↗</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// slippage row
// ─────────────────────────────────────────────────────────────
function SlippageRow({ value, onChange }: { value: bigint; onChange: (v: bigint) => void }) {
  return (
    <div className="slippage-row">
      <span>slip tolerance</span>
      <div className="slippage-buttons">
        {SLIPPAGE_PRESETS.map(bps => (
          <button
            key={String(bps)}
            className={value === bps ? 'active' : ''}
            onClick={() => onChange(bps)}
          >
            {Number(bps) / 100}%
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// tx status — distinguishes user-rejection from chain revert
// ─────────────────────────────────────────────────────────────
function TxStatus({ hash, isPending, isConfirming, isSuccess, error, chainId }: {
  hash?: `0x${string}`
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  chainId: number
}) {
  if (error) {
    if (isUserRejection(error)) {
      return <div className="status-msg">cancelled</div>
    }
    const msg = (error as any).shortMessage || error.message || 'transaction failed'
    return <div className="status-msg error">{msg.slice(0, 200)}</div>
  }
  if (isPending) return <div className="status-msg pending">awaiting wallet signature…</div>
  if (isConfirming) {
    const url = `https://etherscan.io/tx/${hash}`
    return (
      <div className="status-msg pending">
        confirming on-chain…
        <a href={url} target="_blank" rel="noopener noreferrer">view ↗</a>
      </div>
    )
  }
  if (isSuccess) {
    const url = `https://etherscan.io/tx/${hash}`
    return (
      <div className="status-msg success">
        confirmed
        <a href={url} target="_blank" rel="noopener noreferrer">view ↗</a>
      </div>
    )
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// MINT — unleveraged buy
// ─────────────────────────────────────────────────────────────
function MintTab({ pool, address, slippage, setSlippage, configured, disabled, chainId }: any) {
  const { watchAsset } = useWatchAsset()
  const { data: ethBalance } = useBalance({ address, chainId })
  const [input, setInput] = useState('')

  const ethIn = useMemo(() => parseEth(input), [input])
  const grossOut = useMemo(() => (ethIn && ethIn > 0n)
    ? quoteBuyGross(pool.phantom, pool.curveTokens, ethIn) : 0n, [ethIn, pool.phantom, pool.curveTokens])
  const netOut = useMemo(() => applyFee(grossOut), [grossOut])
  const minOut = useMemo(() => applySlippage(netOut, slippage), [netOut, slippage])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId })
  const qc = useQueryClient()
  useEffect(() => { if (isSuccess) qc.invalidateQueries() }, [isSuccess, qc])

  const onMint = () => {
    if (!ethIn || !configured) return
    const { commands, inputs } = encodeV4SwapExactIn({
      chainId, zeroForOne: true, amountIn: ethIn, amountOutMin: minOut,
    })
    writeContract({
      address: universalRouterFor(chainId),
      abi: universalRouterAbi,
      functionName: 'execute',
      args: [commands, inputs, swapDeadline()],
      value: ethIn,
      chainId,
    })
  }

  const tooSmall    = ethIn !== null && ethIn > 0n && ethIn < MIN_TRADE_ETH_WEI
  const insufficient = ethIn !== null && ethBalance && ethIn > ethBalance.value
  const canSubmit   = !disabled && configured && ethIn !== null && ethIn > 0n
    && !tooSmall && !insufficient && !isPending && !isConfirming

  return (
    <>
      <div className="input-row">
        <div className="lab">eth in</div>
        <input className="amount" inputMode="decimal" placeholder="0.0" value={input}
               onChange={e => { setInput(e.target.value); reset() }} />
        <div className="denom">ETH</div>
      </div>
      <div className="input-aux">
        <span className="balance">bal <strong>{ethBalance ? formatEth(ethBalance.value, 4) : '0'}</strong> Ξ</span>
        <button className="max" onClick={() => setInput(applyMaxWithGasReserve(ethBalance?.value))}>MAX</button>
      </div>

      <div className="quote">
        <div className="qr"><span className="qk">receive</span><span className="qv">{formatRise(netOut)} <span className="unit">RIS3</span></span></div>
        <div className="qr"><span className="qk">min after slip</span><span className="qv">{formatRise(minOut)} <span className="unit">RIS3</span></span></div>
        <div className="qr"><span className="qk">fee 2%</span><span className="qv">
          {formatRise(grossOut - netOut, 4)} <span className="unit">RIS3</span>
          <button className="add-mm" onClick={() => addRise(watchAsset, riseTokenAddressFor(chainId))} title="Add RIS3 to wallet">+ wallet</button>
        </span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className={`action-btn side-buy`} disabled={!canSubmit} onClick={onMint}>
        {tooSmall ? 'min 0.01 Ξ'
          : insufficient ? 'insufficient ETH'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : 'Buy RIS3'}
        {canSubmit && <span className="arrow">&gt;&gt;</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// BURN — unleveraged sell
// ─────────────────────────────────────────────────────────────
// Sell path uses Universal Router + Permit2. Two-step grant:
//   1. ERC20.approve(Permit2, max)                         — one-time per token per wallet
//   2. Permit2.approve(RIS3, UniversalRouter, max, exp)    — one-time per (token, spender) tuple
// Both are infinite-allowance + far-future expiration so the user only ever signs them once.
function BurnTab({ pool, address, slippage, setSlippage, configured, disabled, chainId }: any) {
  const { watchAsset } = useWatchAsset()
  const [input, setInput] = useState('')

  const ris3 = riseTokenAddressFor(chainId)
  const router = universalRouterFor(chainId)

  const { data: _rb } = useReadContract({
    address: ris3, abi: ris3TokenAbi, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId, query: { enabled: !!address, refetchInterval: 12_000 },
  })
  const riseBalance = ((_rb ?? 0n) as bigint)

  // (1) ERC20 allowance: owner → Permit2
  const { data: _erc20Al, refetch: refetchErc20Allowance } = useReadContract({
    address: ris3, abi: ris3TokenAbi, functionName: 'allowance',
    args: address ? [address, PERMIT2] : undefined, chainId, query: { enabled: !!address },
  })
  const erc20Allowance = ((_erc20Al ?? 0n) as bigint)

  // (2) Permit2 allowance: (owner, RIS3, UR) → (amount, expiration, nonce)
  const { data: _p2Al, refetch: refetchPermit2Allowance } = useReadContract({
    address: PERMIT2, abi: permit2Abi, functionName: 'allowance',
    args: address ? [address, ris3, router] : undefined, chainId, query: { enabled: !!address },
  })
  const permit2Amount    = ((_p2Al as any)?.[0] ?? 0n) as bigint
  const permit2Expiry    = Number((_p2Al as any)?.[1] ?? 0n)
  const nowSec           = Math.floor(Date.now() / 1000)
  const permit2Sufficient = (amt: bigint) => permit2Amount >= amt && permit2Expiry > nowSec

  const riseIn = useMemo(() => parseEth(input), [input])
  const grossOut = useMemo(() => (riseIn && riseIn > 0n)
    ? quoteSellGross(pool.phantom, pool.curveTokens, riseIn) : 0n, [riseIn, pool.phantom, pool.curveTokens])
  const netOut = useMemo(() => applyFee(grossOut), [grossOut])
  const minOut = useMemo(() => applySlippage(netOut, slippage), [netOut, slippage])

  const needsErc20Approve  = riseIn !== null && riseIn > 0n && erc20Allowance < riseIn
  const needsPermit2Approve = riseIn !== null && riseIn > 0n && !needsErc20Approve && !permit2Sufficient(riseIn)

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId })
  const qc = useQueryClient()
  useEffect(() => {
    if (isSuccess) {
      qc.invalidateQueries()
      refetchErc20Allowance()
      refetchPermit2Allowance()
    }
  }, [isSuccess, qc, refetchErc20Allowance, refetchPermit2Allowance])

  // Step 1: token → Permit2 (max approval)
  const onApproveErc20 = () => writeContract({
    address: ris3, abi: ris3TokenAbi, functionName: 'approve',
    args: [PERMIT2, 2n ** 256n - 1n], chainId,
  })

  // Step 2: Permit2 → UR. amount is uint160 max, expiration ~30 days out.
  const onApprovePermit2 = () => writeContract({
    address: PERMIT2, abi: permit2Abi, functionName: 'approve',
    args: [ris3, router, (2n ** 160n - 1n), Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60],
    chainId,
  })

  // Step 3: swap via UR.
  const onBurn = () => {
    if (!riseIn || !configured) return
    const { commands, inputs } = encodeV4SwapExactIn({
      chainId, zeroForOne: false, amountIn: riseIn, amountOutMin: minOut,
    })
    writeContract({
      address: router, abi: universalRouterAbi, functionName: 'execute',
      args: [commands, inputs, swapDeadline()], chainId,
    })
  }

  // 1 RIS3 = 1e18. Soft dust floor 0.001 RIS3.
  const tooSmall    = riseIn !== null && riseIn > 0n && riseIn < 10n ** 15n
  const insufficient = riseIn !== null && riseIn > riseBalance
  const canSubmit   = !disabled && configured && riseIn !== null && riseIn > 0n && !tooSmall && !insufficient && !isPending && !isConfirming

  const action = needsErc20Approve ? onApproveErc20 : needsPermit2Approve ? onApprovePermit2 : onBurn
  const actionLabel =
      tooSmall                ? 'too small'
    : insufficient            ? 'insufficient RIS3'
    : isPending               ? 'sign in wallet…'
    : isConfirming            ? 'confirming…'
    : needsErc20Approve       ? '1/2  Approve RIS3'
    : needsPermit2Approve     ? '2/2  Permit2 grant'
    :                           'Sell RIS3'

  return (
    <>
      <div className="input-row">
        <div className="lab">ris3 in</div>
        <input className="amount" inputMode="decimal" placeholder="0.0" value={input}
               onChange={e => { setInput(e.target.value); reset() }} />
        <div className="denom">RIS3</div>
      </div>
      <div className="input-aux">
        <span className="balance">bal <strong>{formatRise(riseBalance, 2)}</strong> RIS3</span>
        <button className="max" onClick={() => setInput(formatRise(riseBalance, 6))}>MAX</button>
      </div>

      <div className="quote">
        <div className="qr"><span className="qk">receive</span><span className="qv">{formatEth(netOut, 6)} <span className="unit">ETH</span></span></div>
        <div className="qr"><span className="qk">min after slip</span><span className="qv">{formatEth(minOut, 6)} <span className="unit">ETH</span></span></div>
        <div className="qr"><span className="qk">fee 2%</span><span className="qv">
          {formatEth(grossOut - netOut, 6)} <span className="unit">ETH</span>
          <button className="add-mm" onClick={() => addRise(watchAsset, riseTokenAddressFor(chainId))}>+ wallet</button>
        </span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className={`action-btn side-sell`} disabled={!canSubmit} onClick={action}>
        {actionLabel}
        {canSubmit && <span className="arrow">&gt;&gt;</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// OPEN — leveraged long
// ─────────────────────────────────────────────────────────────
function OpenTab({ pool, address, slippage, setSlippage, configured, disabled, chainId }: any) {
  const hookAddress = hookAddressFor(chainId)
  const { watchAsset } = useWatchAsset()
  const { data: ethBalance } = useBalance({ address, chainId })
  const price = usePoolPrice(chainId)
  const [input, setInput] = useState('')
  const [leverage, setLeverage] = useState<2 | 3>(3)
  const [slPct, setSlPct] = useState('')   // user-friendly drop %, blank = no SL
  const [tpPct, setTpPct] = useState('')   // user-friendly rise %, blank = no TP

  const ethIn = useMemo(() => parseEth(input), [input])
  const quote = useMemo(() => (ethIn && ethIn > 0n)
    ? quoteOpen(pool.phantom, pool.curveTokens, ethIn, leverage) : null, [ethIn, leverage, pool.phantom, pool.curveTokens])
  const minCollateral = useMemo(() => quote ? applySlippage(quote.collateral, slippage) : 0n, [quote, slippage])

  // Pre-check: debt cap.
  const wouldExceedDebtCap = quote && quote.debt > pool.debtHeadroom

  const priceQuote = useMemo(() => {
    if (!quote || quote.collateral === 0n) return null
    // bigint ratio: entryPrice in wei/wei × 1e18 for precision
    const entryPrice1e18 = (quote.curveImpact * 10n ** 18n) / quote.collateral
    const liqPrice1e18   = (quote.liquidationCv * 10n ** 18n) / quote.collateral
    return {
      entryPrice: Number(entryPrice1e18) / 1e18,
      liqPrice:   Number(liqPrice1e18)   / 1e18,
      liqDropPct: entryPrice1e18 > 0n
        ? (1 - Number(liqPrice1e18) / Number(entryPrice1e18)) * 100
        : 0,
    }
  }, [quote])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId })
  const qc = useQueryClient()
  useEffect(() => { if (isSuccess) qc.invalidateQueries() }, [isSuccess, qc])

  const onOpen = () => {
    if (!ethIn || !configured) return
    // V13: open(uint8 leverage, uint256 minCollateral, uint160 slSqrtPriceX96, uint160 tpSqrtPriceX96)
    // 0 sl/tp = no triggers. User-entered % converted using current pool price.
    const slNum = parseFloat(slPct)
    const tpNum = parseFloat(tpPct)
    const slSqrt = (price.ready && slNum > 0)
      ? slSqrtX96FromDropPct(price.ethPerRis3, slNum) : 0n
    const tpSqrt = (price.ready && tpNum > 0)
      ? tpSqrtX96FromRisePct(price.ethPerRis3, tpNum) : 0n
    writeContract({
      address: ris3VaultFor(chainId), abi: ris3VaultAbi, functionName: 'open',
      args: [leverage, minCollateral, slSqrt, tpSqrt], value: ethIn, chainId,
    })
  }

  const tooSmall    = ethIn !== null && ethIn > 0n && ethIn < MIN_POSITION
  const insufficient = ethIn !== null && ethBalance && ethIn > ethBalance.value
  const canSubmit   = !disabled && configured && ethIn !== null && ethIn >= MIN_POSITION
    && !insufficient && !wouldExceedDebtCap && !isPending && !isConfirming

  return (
    <>
      <div className="input-row">
        <div className="lab">stake</div>
        <input className="amount" inputMode="decimal" placeholder="0.0" value={input}
               onChange={e => { setInput(e.target.value); reset() }} />
        <div className="denom">ETH</div>
      </div>
      <div className="input-aux">
        <span className="balance">bal <strong>{ethBalance ? formatEth(ethBalance.value, 4) : '0'}</strong> Ξ · min 0.05</span>
        <button className="max" onClick={() => setInput(applyMaxWithGasReserve(ethBalance?.value))}>MAX</button>
      </div>

      <div className="lev-picker">
        {LEVERAGE_TIERS.map(L => (
          <button key={L} className={`lev-pick ${leverage === L ? 'active' : ''}`} onClick={() => setLeverage(L as 2 | 3)}>
            <span className="x">{L}×</span>
            <span className="lab">{L}x long</span>
          </button>
        ))}
      </div>

      {quote && ethIn !== null && ethIn > 0n && (
        <div className="quote">
          <div className="qr"><span className="qk">exposure</span><span className="qv acc">{formatEth(quote.curveImpact, 4)} <span className="unit">Ξ</span></span></div>
          <div className="qr"><span className="qk">entry px</span><span className="qv">{priceQuote ? priceQuote.entryPrice.toExponential(3) : '—'} <span className="unit">Ξ/RIS3</span></span></div>
          <div className="qr"><span className="qk">collateral</span><span className="qv">{formatRise(quote.collateral)} <span className="unit">RIS3</span></span></div>
          <div className="qr"><span className="qk">debt</span><span className="qv">{formatEth(quote.debt, 4)} <span className="unit">Ξ</span></span></div>
          <div className="qr"><span className="qk">liq px</span><span className="qv red">{priceQuote ? priceQuote.liqPrice.toExponential(3) : '—'} <span className="unit">Ξ/RIS3</span></span></div>
          <div className="qr"><span className="qk">drop to liq</span><span className="qv red">{priceQuote ? priceQuote.liqDropPct.toFixed(1) + '%' : '—'}</span></div>
          <div className="qr"><span className="qk">min coll (slip)</span><span className="qv">
            {formatRise(minCollateral)} <span className="unit">RIS3</span>
            <button className="add-mm" onClick={() => addRise(watchAsset, riseTokenAddressFor(chainId))}>+ wallet</button>
          </span></div>
          {wouldExceedDebtCap && (
            <div className="qr"><span className="qk red">debt cap</span><span className="qv red">
              {formatEth(pool.debtHeadroom, 4)} Ξ headroom · this open needs {formatEth(quote.debt, 4)} Ξ
            </span></div>
          )}
        </div>
      )}

      <div className="trigger-row">
        <div className="trigger-cell">
          <div className="lab">stop-loss</div>
          <input className="trigger-input" inputMode="decimal" placeholder="off"
                 value={slPct} onChange={e => setSlPct(e.target.value.replace(/[^0-9.]/g,''))} />
          <div className="trigger-suffix">% drop</div>
        </div>
        <div className="trigger-cell">
          <div className="lab">take-profit</div>
          <input className="trigger-input" inputMode="decimal" placeholder="off"
                 value={tpPct} onChange={e => setTpPct(e.target.value.replace(/[^0-9.]/g,''))} />
          <div className="trigger-suffix">% rise</div>
        </div>
      </div>
      <div className="trigger-hint">
        triggers are optional · anyone can call <code>closeOnTrigger</code> when hit (1% bounty, max 0.001 Ξ)
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className={`action-btn side-buy`} disabled={!canSubmit} onClick={onOpen}>
        {tooSmall ? 'min 0.05 Ξ'
          : insufficient ? 'insufficient ETH'
          : wouldExceedDebtCap ? 'DEBT CAP REACHED'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : `Open ${leverage}× long`}
        {canSubmit && <span className="arrow">&gt;&gt;</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// POSITIONS — list + close
// ─────────────────────────────────────────────────────────────
function PositionsTab({ pool, address, slippage, configured, disabled, chainId, blockNumber }: any) {
  const hookAddress = hookAddressFor(chainId)
  const { positions, isLoading, isError } = useUserPositions(address, chainId)
  const price = usePoolPrice(chainId)   // live spot price for PnL — refreshes every 8s
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId })
  const qc = useQueryClient()
  useEffect(() => { if (isSuccess) qc.invalidateQueries() }, [isSuccess, qc])
  const [closingId, setClosingId] = useState<bigint | null>(null)
  const [editingId, setEditingId] = useState<bigint | null>(null)
  const [editSlPct, setEditSlPct] = useState('')
  const [editTpPct, setEditTpPct] = useState('')

  const onClose = async (id: bigint, _collateral: bigint, _debt: bigint) => {
    if (!configured) return
    setClosingId(id)
    reset()
    writeContract({
      address: ris3VaultFor(chainId), abi: ris3VaultAbi, functionName: 'close',
      args: [id, 0n], chainId,
    })
  }

  const onSaveTriggers = (id: bigint) => {
    if (!configured || !price.ready) return
    const slNum = parseFloat(editSlPct)
    const tpNum = parseFloat(editTpPct)
    const slSqrt = slNum > 0 ? slSqrtX96FromDropPct(price.ethPerRis3, slNum) : 0n
    const tpSqrt = tpNum > 0 ? tpSqrtX96FromRisePct(price.ethPerRis3, tpNum) : 0n
    reset()
    writeContract({
      address: ris3VaultFor(chainId), abi: ris3VaultAbi, functionName: 'setTriggers',
      args: [id, slSqrt, tpSqrt], chainId,
    })
    setEditingId(null)
  }

  if (!configured) return <div className="empty-positions">not deployed yet</div>
  if (isError)     return <div className="empty-positions">couldn't fetch positions · refresh page</div>
  if (isLoading)   return <div className="empty-positions">loading positions…</div>
  if (positions.length === 0) return <div className="empty-positions">no open positions · use OPEN to start</div>

  return (
    <>
      <div className="positions-list">
        {positions.map((p: any) => {
          // Live PnL math using current pool spot price.
          // collateral is in ris3 wei (uint128). ethPerRis3 is in ETH per 1 ris3 (JS number).
          // Convert collateral (1e18 base) to whole-ris3 units, multiply by ethPerRis3, scale back to wei.
          const collateralEthWei = price.ready
            ? BigInt(Math.floor(Number(p.collateral) / 1e18 * price.ethPerRis3 * 1e18))
            : 0n
          const debtWei = BigInt(p.debt)
          const equityWei = collateralEthWei > debtWei ? collateralEthWei - debtWei : 0n
          const underwaterWei = collateralEthWei < debtWei ? debtWei - collateralEthWei : 0n

          // health ratio = collateral_value / debt. At open, ~2 for 2x, ~3 for 3x. Drops as price falls.
          // Liquidatable when health < 1.4 (per contract LIQ_THRESHOLD_BPS = 14000).
          const healthRatio = price.ready && debtWei > 0n
            ? Number(collateralEthWei) / Number(debtWei)
            : 0
          const liq = price.ready && healthRatio < 1.4 && healthRatio > 0
          const warning = price.ready && !liq && healthRatio < 1.6
          const cardClass = liq ? 'liq' : warning ? 'warning' : ''
          // Visual: full at 3x health, empty at 1x. Liquidation line is at 1.4x.
          const healthFillPct = price.ready
            ? Math.max(2, Math.min(100, ((healthRatio - 1) / 2) * 100))
            : 50

          // PnL vs debt — gives intuitive "your position is up X% from break-even"
          const pnlPct = price.ready && debtWei > 0n
            ? ((Number(collateralEthWei) - Number(debtWei)) / Number(debtWei)) * 100
            : 0

          // Same-block close blocker — contract reverts SameBlockClose when block.number ≤ openBlock.
          const currentBlock = blockNumber ? BigInt(blockNumber) : 0n
          const sameBlock = currentBlock !== 0n && currentBlock <= p.openBlock
          const closeDisabled = disabled || sameBlock
            || (isPending && closingId === p.id) || (isConfirming && closingId === p.id)

          return (
            <div className={`pos-card ${cardClass}`} key={String(p.id)}>
              <div className="id">
                <span>#{String(p.id)} · levered long · blk {String(p.openBlock)}</span>
                <span className="x">{healthRatio > 0 ? healthRatio.toFixed(2) + '×' : 'live'}</span>
              </div>

              <div className="body">
                <div><div className="pk">collateral</div><div className="pv">{formatRise(p.collateral, 0)}</div></div>
                <div><div className="pk">value now</div><div className={`pv ${pnlPct >= 0 ? 'grn' : 'red'}`}>{price.ready ? formatEth(collateralEthWei, 4) : '—'} Ξ</div></div>
                <div><div className="pk">debt</div><div className="pv">{formatEth(debtWei, 4)} Ξ</div></div>
                <div><div className="pk">equity</div><div className={`pv ${equityWei > 0n ? 'grn' : 'red'}`}>{price.ready ? (underwaterWei > 0n ? '-' + formatEth(underwaterWei, 4) : formatEth(equityWei, 4)) : '—'} Ξ</div></div>
                <div><div className="pk">vs debt</div><div className={`pv ${pnlPct >= 0 ? 'grn' : 'red'}`}>{price.ready ? (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(1) + '%' : '—'}</div></div>
              </div>

              <div className="health">
                <div className="health-track">
                  <div className="health-fill" style={{ width: `${healthFillPct}%` }} />
                </div>
                <div className="health-meta">
                  <span>health · {healthRatio > 0 ? healthRatio.toFixed(2) + '×' : '—'}</span>
                  <span><strong>{liq ? 'LIQUIDATABLE' : warning ? 'warning' : 'healthy'}</strong> · liq @ 1.40×</span>
                </div>
              </div>

              {/* SL/TP row — display + edit */}
              {(() => {
                const slEth = p.slSqrtPriceX96 > 0n ? sqrtX96ToEthPerRis3(p.slSqrtPriceX96) : 0
                const tpEth = p.tpSqrtPriceX96 > 0n ? sqrtX96ToEthPerRis3(p.tpSqrtPriceX96) : 0
                const isEditing = editingId === p.id
                return (
                  <div className="triggers">
                    {!isEditing && (
                      <div className="trigger-display">
                        <span className="tk">SL</span>
                        <span className="tv">{slEth > 0 ? slEth.toExponential(3) + ' Ξ/RIS3' : 'off'}</span>
                        <span className="tk">TP</span>
                        <span className="tv">{tpEth > 0 ? tpEth.toExponential(3) + ' Ξ/RIS3' : 'off'}</span>
                        <button className="edit-triggers" onClick={() => {
                          setEditingId(p.id); setEditSlPct(''); setEditTpPct('')
                        }} disabled={disabled}>edit</button>
                      </div>
                    )}
                    {isEditing && (
                      <div className="trigger-edit">
                        <input className="trigger-input" inputMode="decimal" placeholder="SL % drop"
                               value={editSlPct} onChange={e => setEditSlPct(e.target.value.replace(/[^0-9.]/g,''))} />
                        <input className="trigger-input" inputMode="decimal" placeholder="TP % rise"
                               value={editTpPct} onChange={e => setEditTpPct(e.target.value.replace(/[^0-9.]/g,''))} />
                        <button className="save-triggers" onClick={() => onSaveTriggers(p.id)} disabled={!price.ready || disabled}>save</button>
                        <button className="cancel-triggers" onClick={() => setEditingId(null)}>cancel</button>
                      </div>
                    )}
                  </div>
                )
              })()}

              <button
                className="close"
                onClick={() => onClose(p.id, p.collateral, p.debt)}
                disabled={closeDisabled}
                title={sameBlock ? 'wait one block after open' : undefined}
              >
                {sameBlock ? '[ wait 1 block ]'
                  : closingId === p.id && isPending    ? 'sign…'
                  : closingId === p.id && isConfirming ? 'closing…'
                  : '[ close position ]'}
              </button>
            </div>
          )
        })}
      </div>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}
