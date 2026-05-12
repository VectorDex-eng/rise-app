import { useState, useMemo, useEffect } from 'react'
import {
  useAccount, useBalance, useChainId, useReadContract, useWatchAsset,
  useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useBlockNumber,
} from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { riseHookAbi } from '../abi/RiseLeverageHook'
import { riseTokenAbi } from '../abi/RiseToken'
import { poolSwapTestAbi } from '../abi/PoolSwapTest'
import {
  hookAddressFor, isHookConfigured, chainName, DEFAULT_CHAIN_ID,
  SLIPPAGE_PRESETS, DEFAULT_SLIPPAGE_BPS, MIN_POSITION, LEVERAGE_TIERS,
  RISE_TOKEN_ADDRESS_SEPOLIA, POOL_SWAP_TEST_SEPOLIA, TOTAL_SUPPLY,
  GAS_RESERVE_WEI, MIN_TRADE_ETH_WEI,
} from '../lib/config'
import {
  quoteBuyGross, quoteSellGross, quoteOpen, quoteClose,
  applySlippage, applyFee, formatEth, formatRise, parseEth,
  collateralValueOf, equityOf, isLiquidatable,
} from '../lib/curve'
import { usePoolState } from '../hooks/usePoolState'
import { useUserPositions } from '../hooks/useUserPositions'
import '../styles/widget.css'

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

function addRise(watchAsset: ReturnType<typeof useWatchAsset>['watchAsset']) {
  watchAsset({ type: 'ERC20', options: { address: RISE_TOKEN_ADDRESS_SEPOLIA, symbol: 'RIS3', decimals: 18 } })
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
        <div className="st"><span className="st-k">price</span><span className="st-v">{stats.price}</span></div>
        <div className="st"><span className="st-k">fdv</span>  <span className="st-v">{formatEthShort(stats.fdvWei)} Ξ</span></div>
        <div className="st"><span className="st-k">tvl</span>  <span className="st-v">{formatEthShort(stats.tvlEth)} Ξ</span></div>
        <div className="st"><span className="st-k">open</span> <span className="st-v">{stats.openCt}</span></div>
      </div>

      <div className="widget-tabs" role="tablist">
        <button role="tab" className={`widget-tab ${tab === 'mint' ? 'active' : ''}`}  onClick={() => setTab('mint')}>Mint</button>
        <button role="tab" className={`widget-tab ${tab === 'burn' ? 'active' : ''}`}  onClick={() => setTab('burn')}>Burn</button>
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
        <span>fee 50bps · slip {Number(slippage) / 100}%</span>
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
    const url = chainId === 1
      ? `https://etherscan.io/tx/${hash}`
      : `https://sepolia.etherscan.io/tx/${hash}`
    return (
      <div className="status-msg pending">
        confirming on-chain…
        <a href={url} target="_blank" rel="noopener noreferrer">view ↗</a>
      </div>
    )
  }
  if (isSuccess) {
    const url = chainId === 1
      ? `https://etherscan.io/tx/${hash}`
      : `https://sepolia.etherscan.io/tx/${hash}`
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
  const hookAddress = hookAddressFor(chainId)
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
    writeContract({
      address: POOL_SWAP_TEST_SEPOLIA,
      abi: poolSwapTestAbi,
      functionName: 'swap',
      args: [
        { currency0: '0x0000000000000000000000000000000000000000', currency1: RISE_TOKEN_ADDRESS_SEPOLIA, fee: 10000, tickSpacing: 60, hooks: hookAddress },
        { zeroForOne: true, amountSpecified: -ethIn, sqrtPriceLimitX96: 4295128740n },
        { takeClaims: false, settleUsingBurn: false },
        '0x',
      ],
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
        <div className="qr"><span className="qk">fee 50bps</span><span className="qv">
          {formatRise(grossOut - netOut, 4)} <span className="unit">RIS3</span>
          <button className="add-mm" onClick={() => addRise(watchAsset)} title="Add RIS3 to wallet">+ wallet</button>
        </span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className={`action-btn side-buy`} disabled={!canSubmit} onClick={onMint}>
        {tooSmall ? 'min 0.01 Ξ'
          : insufficient ? 'insufficient ETH'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : 'Mint RIS3'}
        {canSubmit && <span className="arrow">&gt;&gt;</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// BURN — unleveraged sell
// ─────────────────────────────────────────────────────────────
function BurnTab({ pool, address, slippage, setSlippage, configured, disabled, chainId }: any) {
  const hookAddress = hookAddressFor(chainId)
  const { watchAsset } = useWatchAsset()
  const [input, setInput] = useState('')

  const { data: _rb } = useReadContract({
    address: RISE_TOKEN_ADDRESS_SEPOLIA, abi: riseTokenAbi, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId, query: { enabled: !!address, refetchInterval: 12_000 },
  })
  const riseBalance = ((_rb ?? 0n) as bigint)

  const { data: _al, refetch: refetchAllowance } = useReadContract({
    address: RISE_TOKEN_ADDRESS_SEPOLIA, abi: riseTokenAbi, functionName: 'allowance',
    args: address ? [address, POOL_SWAP_TEST_SEPOLIA] : undefined, chainId, query: { enabled: !!address },
  })
  const allowance = ((_al ?? 0n) as bigint)

  const riseIn = useMemo(() => parseEth(input), [input])
  const grossOut = useMemo(() => (riseIn && riseIn > 0n)
    ? quoteSellGross(pool.phantom, pool.curveTokens, riseIn) : 0n, [riseIn, pool.phantom, pool.curveTokens])
  const netOut = useMemo(() => applyFee(grossOut), [grossOut])
  const minOut = useMemo(() => applySlippage(netOut, slippage), [netOut, slippage])

  const needsApprove = riseIn !== null && riseIn > 0n && allowance < riseIn

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId })
  const qc = useQueryClient()
  useEffect(() => { if (isSuccess) { qc.invalidateQueries(); refetchAllowance() } }, [isSuccess, qc, refetchAllowance])

  const onApprove = () => writeContract({
    address: RISE_TOKEN_ADDRESS_SEPOLIA, abi: riseTokenAbi, functionName: 'approve',
    args: [POOL_SWAP_TEST_SEPOLIA, 2n ** 256n - 1n], chainId,
  })

  const onBurn = () => {
    if (!riseIn || !configured) return
    writeContract({
      address: POOL_SWAP_TEST_SEPOLIA, abi: poolSwapTestAbi, functionName: 'swap',
      args: [
        { currency0: '0x0000000000000000000000000000000000000000', currency1: RISE_TOKEN_ADDRESS_SEPOLIA, fee: 10000, tickSpacing: 60, hooks: hookAddress },
        { zeroForOne: false, amountSpecified: -riseIn, sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970341n },
        { takeClaims: false, settleUsingBurn: false },
        '0x',
      ],
      chainId,
    })
  }

  // Token side: 1 RISE = 1e18. Use 0.001 RISE as a soft dust floor (contract floor is 1 RISE).
  const tooSmall    = riseIn !== null && riseIn > 0n && riseIn < 10n ** 15n
  const insufficient = riseIn !== null && riseIn > riseBalance
  const canSubmit   = !disabled && configured && riseIn !== null && riseIn > 0n && !tooSmall && !insufficient && !isPending && !isConfirming

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
        <div className="qr"><span className="qk">fee 50bps</span><span className="qv">
          {formatEth(grossOut - netOut, 6)} <span className="unit">ETH</span>
          <button className="add-mm" onClick={() => addRise(watchAsset)}>+ wallet</button>
        </span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className={`action-btn side-sell`} disabled={!canSubmit} onClick={needsApprove ? onApprove : onBurn}>
        {tooSmall ? 'too small'
          : insufficient ? 'insufficient RIS3'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : needsApprove ? 'Approve RIS3'
          : 'Burn RIS3'}
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
  const [input, setInput] = useState('')
  const [leverage, setLeverage] = useState<2 | 3>(3)

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
    writeContract({
      address: hookAddress, abi: riseHookAbi, functionName: 'openLeveragedPosition',
      args: [leverage, minCollateral], value: ethIn, chainId,
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
            <button className="add-mm" onClick={() => addRise(watchAsset)}>+ wallet</button>
          </span></div>
          {wouldExceedDebtCap && (
            <div className="qr"><span className="qk red">debt cap</span><span className="qv red">
              {formatEth(pool.debtHeadroom, 4)} Ξ headroom · this open needs {formatEth(quote.debt, 4)} Ξ
            </span></div>
          )}
        </div>
      )}

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
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId })
  const qc = useQueryClient()
  useEffect(() => { if (isSuccess) qc.invalidateQueries() }, [isSuccess, qc])
  const [closingId, setClosingId] = useState<bigint | null>(null)

  // Refetch the pool right before encoding minProceeds so slippage is fresh.
  const onClose = async (id: bigint, collateral: bigint, debt: bigint) => {
    if (!configured) return
    const fresh = await pool.refetch?.()
    // Use freshest possible state for the quote
    const phantom = (fresh?.data?.[0]?.result as bigint | undefined) ?? pool.phantom
    const curveT  = (fresh?.data?.[2]?.result as bigint | undefined) ?? pool.curveTokens
    const closeQuote = quoteClose(phantom, curveT, collateral, debt)
    const minProceeds = applySlippage(closeQuote.toUser, slippage)
    setClosingId(id)
    reset()
    writeContract({
      address: hookAddress, abi: riseHookAbi, functionName: 'closePosition',
      args: [id, minProceeds], chainId,
    })
  }

  if (!configured) return <div className="empty-positions">not deployed yet</div>
  if (isError)     return <div className="empty-positions">couldn't fetch positions · refresh page</div>
  if (isLoading)   return <div className="empty-positions">loading positions…</div>
  if (positions.length === 0) return <div className="empty-positions">no open positions · use OPEN to start</div>

  return (
    <>
      <div className="positions-list">
        {positions.map((p: any) => {
          const cv = collateralValueOf(pool.phantom, pool.curveTokens, p.collateral)
          const equity = equityOf(pool.phantom, pool.curveTokens, p.collateral, p.debt)
          const liq = isLiquidatable(pool.phantom, pool.curveTokens, p.collateral, p.debt)
          const threshold = (p.debt * 13000n) / 10000n
          const distancePct = cv > threshold
            ? Number(((cv - threshold) * 10000n) / (threshold || 1n)) / 100
            : 0
          const warning = !liq && distancePct < 15
          const cardClass = liq ? 'liq' : warning ? 'warning' : ''
          const healthFillPct = liq ? 0 : Math.max(5, Math.min(100, distancePct * 2))

          // Same-block close blocker — contract reverts SameBlockClose when block.number ≤ openBlock.
          const currentBlock = blockNumber ? BigInt(blockNumber) : 0n
          const sameBlock = currentBlock !== 0n && currentBlock <= p.openBlock
          const closeDisabled = disabled || sameBlock
            || (isPending && closingId === p.id) || (isConfirming && closingId === p.id)

          return (
            <div className={`pos-card ${cardClass}`} key={String(p.id)}>
              <div className="id">
                <span>#{String(p.id)} · {p.leverageTier}× long · blk {String(p.openBlock)}</span>
                <span className="x">{p.leverageTier}×</span>
              </div>

              <div className="body">
                <div><div className="pk">collateral</div><div className="pv">{formatRise(p.collateral, 0)}</div></div>
                <div><div className="pk">debt</div><div className="pv">{formatEth(p.debt, 4)} Ξ</div></div>
                <div><div className="pk">equity</div><div className={`pv ${equity >= 0n ? 'grn' : 'red'}`}>{formatEth(equity, 4)} Ξ</div></div>
              </div>

              <div className="health">
                <div className="health-track">
                  <div className="health-fill" style={{ width: `${healthFillPct}%` }} />
                </div>
                <div className="health-meta">
                  <span>health</span>
                  <span><strong>{liq ? 'LIQUIDATABLE' : `${distancePct.toFixed(1)}%`}</strong> to liq</span>
                </div>
              </div>

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
