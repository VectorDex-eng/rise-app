import { useState, useMemo } from 'react'
import { useAccount, useBalance, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ris3HookAbi } from '../abi/Ris3LeverageHook'
import {
  hookAddressFor,
  isHookConfigured,
  chainName,
  DEFAULT_CHAIN_ID,
  SLIPPAGE_PRESETS,
  DEFAULT_SLIPPAGE_BPS,
  MIN_POSITION,
  LEVERAGE_TIERS,
} from '../lib/config'
import {
  quoteBuyGross,
  quoteSellGross,
  quoteOpen,
  quoteClose,
  applySlippage,
  applyFee,
  formatEth,
  formatRis3,
  parseEth,
  collateralValueOf,
  equityOf,
  isLiquidatable,
} from '../lib/curve'
import { usePoolState } from '../hooks/usePoolState'
import { useUserPositions } from '../hooks/useUserPositions'
import '../styles/widget.css'

type Tab = 'mint' | 'burn' | 'open' | 'close'

export function TradeWidget() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const targetChainId = DEFAULT_CHAIN_ID
  const wrongNetwork = isConnected && chainId !== targetChainId

  const pool = usePoolState(targetChainId)
  const configured = isHookConfigured(targetChainId)

  const [tab, setTab] = useState<Tab>('mint')
  const [slippage, setSlippage] = useState<bigint>(DEFAULT_SLIPPAGE_BPS)

  return (
    <div className="widget">
      <div className="widget-head">
        <div className="widget-pair">
          RIS3 <span className="slash">/</span> ETH
        </div>
        <span className={`widget-live ${configured ? '' : 'off'}`}>
          {configured ? `live · ${chainName(targetChainId)}` : `${chainName(targetChainId)} · not deployed`}
        </span>
      </div>

      <div className="widget-tabs">
        <button className={`widget-tab ${tab === 'mint' ? 'active' : ''}`} onClick={() => setTab('mint')}>Mint</button>
        <button className={`widget-tab ${tab === 'burn' ? 'active' : ''}`} onClick={() => setTab('burn')}>Burn</button>
        <button className={`widget-tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>Open</button>
        <button className={`widget-tab ${tab === 'close' ? 'active' : ''}`} onClick={() => setTab('close')}>Positions</button>
      </div>

      <div className="widget-body">
        {!configured && (
          <div className="stub-warning">
            <strong>v1.1 not yet deployed</strong> — widget UI loaded; live state and trading enabled once <code>HOOK_ADDRESS_SEPOLIA</code> is set in <code>src/lib/config.ts</code>.
          </div>
        )}

        {wrongNetwork && (
          <div className="net-warning">
            wrong network — connected to chain {chainId}
            <button onClick={() => switchChain({ chainId: targetChainId })}>switch to {chainName(targetChainId)}</button>
          </div>
        )}

        {!isConnected ? (
          <ConnectPrompt />
        ) : tab === 'mint' ? (
          <MintTab pool={pool} address={address!} slippage={slippage} setSlippage={setSlippage} configured={configured} disabled={wrongNetwork || !configured} />
        ) : tab === 'burn' ? (
          <BurnTab pool={pool} address={address!} slippage={slippage} setSlippage={setSlippage} configured={configured} disabled={wrongNetwork || !configured} />
        ) : tab === 'open' ? (
          <OpenTab pool={pool} address={address!} slippage={slippage} setSlippage={setSlippage} configured={configured} disabled={wrongNetwork || !configured} />
        ) : (
          <PositionsTab pool={pool} address={address!} slippage={slippage} setSlippage={setSlippage} configured={configured} disabled={wrongNetwork || !configured} />
        )}
      </div>

      <div className="widget-foot">
        <span>fee: 50 bps · slippage: {Number(slippage) / 100}%</span>
        <a href={`#contract`}>contract ↗</a>
      </div>
    </div>
  )
}

// ───── connect prompt ─────
function ConnectPrompt() {
  return (
    <div className="connect-prompt">
      <div className="ttl">Connect a wallet</div>
      <div className="sub">to trade on the curve</div>
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button className="action-btn" onClick={show}>
            Connect wallet <span className="arrow">→</span>
          </button>
        )}
      </ConnectKitButton.Custom>
    </div>
  )
}

// ───── slippage row ─────
function SlippageRow({ value, onChange }: { value: bigint; onChange: (v: bigint) => void }) {
  return (
    <div className="slippage-row">
      <span>slippage tolerance</span>
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

// ───── tx status display ─────
function TxStatus({ hash, isPending, isConfirming, isSuccess, error, chainId }: {
  hash?: `0x${string}`
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  chainId: number
}) {
  if (error) {
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
        confirming on-chain… <a href={url} target="_blank" rel="noopener noreferrer">view tx ↗</a>
      </div>
    )
  }
  if (isSuccess) {
    const url = chainId === 1
      ? `https://etherscan.io/tx/${hash}`
      : `https://sepolia.etherscan.io/tx/${hash}`
    return (
      <div className="status-msg success">
        confirmed ✓ <a href={url} target="_blank" rel="noopener noreferrer">view tx ↗</a>
      </div>
    )
  }
  return null
}

// ───── mint tab (unleveraged buy) ─────
function MintTab({ pool, address, slippage, setSlippage, configured, disabled }: any) {
  const chainId = DEFAULT_CHAIN_ID
  const hookAddress = hookAddressFor(chainId)
  const { data: ethBalance } = useBalance({ address, chainId })
  const [input, setInput] = useState('')

  const ethIn = useMemo(() => parseEth(input), [input])
  const grossOut = useMemo(() => {
    if (!ethIn || ethIn === 0n) return 0n
    return quoteBuyGross(pool.phantom, pool.curveTokens, ethIn)
  }, [ethIn, pool.phantom, pool.curveTokens])
  const netOut = useMemo(() => applyFee(grossOut), [grossOut])
  const minOut = useMemo(() => applySlippage(netOut, slippage), [netOut, slippage])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const onMint = () => {
    if (!ethIn || !configured) return
    // NOTE: minting via the hook directly isn't how V4 works — users actually swap via
    // Universal Router which routes through the hook. For now this stub calls a (hypothetical)
    // hook.mint() entrypoint OR you can route through Universal Router.
    // WIRE THIS to the real entrypoint after v1.1 deploy + Universal Router calldata test.
    writeContract({
      address: hookAddress,
      abi: ris3HookAbi,
      functionName: 'openPosition', // PLACEHOLDER — real call is Universal Router swap
      args: [1, minOut], // 1x leverage = unleveraged buy
      value: ethIn,
      chainId,
    })
  }

  const tooSmall = ethIn !== null && ethIn > 0n && ethIn < 10n ** 14n // 0.0001 ETH dust floor
  const insufficient = ethIn !== null && ethBalance && ethIn > ethBalance.value
  const canSubmit = !disabled && configured && ethIn !== null && ethIn > 0n && !tooSmall && !insufficient && !isPending && !isConfirming

  return (
    <>
      <div className="input-row">
        <div className="lab">you pay</div>
        <input
          className="amount"
          inputMode="decimal"
          placeholder="0.0"
          value={input}
          onChange={e => { setInput(e.target.value); reset() }}
        />
        <div className="denom">ETH</div>
      </div>
      <div className="input-aux">
        <span className="balance">balance <strong>{ethBalance ? formatEth(ethBalance.value, 4) : '0'}</strong> Ξ</span>
        <button className="max" onClick={() => ethBalance && setInput(formatEth(ethBalance.value, 6))}>MAX</button>
      </div>

      <div className="quote">
        <div className="qr"><span className="qk">you receive (est.)</span><span className="qv">{formatRis3(netOut)} <span className="unit">RIS3</span></span></div>
        <div className="qr"><span className="qk">min after slippage</span><span className="qv">{formatRis3(minOut)} <span className="unit">RIS3</span></span></div>
        <div className="qr"><span className="qk">swap fee (50 bps)</span><span className="qv">{formatRis3(grossOut - netOut, 4)} <span className="unit">RIS3</span></span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className="action-btn" disabled={!canSubmit} onClick={onMint}>
        {tooSmall ? 'amount too small'
          : insufficient ? 'insufficient ETH'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : 'Mint RIS3'}
        {canSubmit && <span className="arrow">→</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ───── burn tab (sell back) ─────
function BurnTab({ pool, address, slippage, setSlippage, configured, disabled }: any) {
  const chainId = DEFAULT_CHAIN_ID
  const hookAddress = hookAddressFor(chainId)
  const [input, setInput] = useState('')

  // RIS3 balance via ERC-6909 — placeholder, real read needs balanceOf(address, id)
  const ris3Balance = 0n // PLACEHOLDER — wire to ERC-6909 balanceOf when ABI is finalized

  const ris3In = useMemo(() => parseEth(input), [input])
  const grossOut = useMemo(() => {
    if (!ris3In || ris3In === 0n) return 0n
    return quoteSellGross(pool.phantom, pool.curveTokens, ris3In)
  }, [ris3In, pool.phantom, pool.curveTokens])
  const netOut = useMemo(() => applyFee(grossOut), [grossOut])
  const minOut = useMemo(() => applySlippage(netOut, slippage), [netOut, slippage])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const onBurn = () => {
    if (!ris3In || !configured) return
    // PLACEHOLDER — real call is Universal Router swap RIS3 → ETH
    // wire to Universal Router after v1.1 deploy
    writeContract({
      address: hookAddress,
      abi: ris3HookAbi,
      functionName: 'closePosition', // PLACEHOLDER
      args: [0n, minOut],
      chainId,
    })
  }

  const tooSmall = ris3In !== null && ris3In > 0n && ris3In < 10n ** 14n
  const insufficient = ris3In !== null && ris3In > ris3Balance
  const canSubmit = !disabled && configured && ris3In !== null && ris3In > 0n && !tooSmall && !insufficient && !isPending && !isConfirming

  return (
    <>
      <div className="input-row">
        <div className="lab">you burn</div>
        <input
          className="amount"
          inputMode="decimal"
          placeholder="0.0"
          value={input}
          onChange={e => { setInput(e.target.value); reset() }}
        />
        <div className="denom">RIS3</div>
      </div>
      <div className="input-aux">
        <span className="balance">balance <strong>{formatRis3(ris3Balance, 2)}</strong> RIS3</span>
        <button className="max" onClick={() => setInput(formatRis3(ris3Balance, 6))}>MAX</button>
      </div>

      <div className="quote">
        <div className="qr"><span className="qk">you receive (est.)</span><span className="qv">{formatEth(netOut, 6)} <span className="unit">ETH</span></span></div>
        <div className="qr"><span className="qk">min after slippage</span><span className="qv">{formatEth(minOut, 6)} <span className="unit">ETH</span></span></div>
        <div className="qr"><span className="qk">swap fee (50 bps)</span><span className="qv">{formatEth(grossOut - netOut, 6)} <span className="unit">ETH</span></span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className="action-btn" disabled={!canSubmit} onClick={onBurn}>
        {tooSmall ? 'amount too small'
          : insufficient ? 'insufficient RIS3'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : 'Burn RIS3'}
        {canSubmit && <span className="arrow">→</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ───── open leveraged position ─────
function OpenTab({ pool, address, slippage, setSlippage, configured, disabled }: any) {
  const chainId = DEFAULT_CHAIN_ID
  const hookAddress = hookAddressFor(chainId)
  const { data: ethBalance } = useBalance({ address, chainId })
  const [input, setInput] = useState('')
  const [leverage, setLeverage] = useState<2 | 3>(3)

  const ethIn = useMemo(() => parseEth(input), [input])
  const quote = useMemo(() => {
    if (!ethIn || ethIn === 0n) return null
    return quoteOpen(pool.phantom, pool.curveTokens, ethIn, leverage)
  }, [ethIn, leverage, pool.phantom, pool.curveTokens])
  const minCollateral = useMemo(() => quote ? applySlippage(quote.collateral, slippage) : 0n, [quote, slippage])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const onOpen = () => {
    if (!ethIn || !configured) return
    writeContract({
      address: hookAddress,
      abi: ris3HookAbi,
      functionName: 'openPosition',
      args: [leverage, minCollateral],
      value: ethIn,
      chainId,
    })
  }

  const tooSmall = ethIn !== null && ethIn > 0n && ethIn < MIN_POSITION
  const insufficient = ethIn !== null && ethBalance && ethIn > ethBalance.value
  const canSubmit = !disabled && configured && ethIn !== null && ethIn >= MIN_POSITION && !insufficient && !isPending && !isConfirming

  return (
    <>
      <div className="input-row">
        <div className="lab">you stake</div>
        <input
          className="amount"
          inputMode="decimal"
          placeholder="0.0"
          value={input}
          onChange={e => { setInput(e.target.value); reset() }}
        />
        <div className="denom">ETH</div>
      </div>
      <div className="input-aux">
        <span className="balance">balance <strong>{ethBalance ? formatEth(ethBalance.value, 4) : '0'}</strong> Ξ · min 0.05 Ξ</span>
        <button className="max" onClick={() => ethBalance && setInput(formatEth(ethBalance.value, 6))}>MAX</button>
      </div>

      <div className="lev-picker">
        {LEVERAGE_TIERS.map(L => (
          <button
            key={L}
            className={`lev-pick ${leverage === L ? 'active' : ''}`}
            onClick={() => setLeverage(L as 2 | 3)}
          >
            <span className="x">{L}×</span>
            <span className="lab">{L}x long</span>
          </button>
        ))}
      </div>

      {quote && ethIn !== null && ethIn > 0n && (
        <div className="quote">
          <div className="qr"><span className="qk">exposure</span><span className="qv acc">{formatEth(quote.curveImpact, 4)} <span className="unit">Ξ</span></span></div>
          <div className="qr"><span className="qk">collateral locked</span><span className="qv">{formatRis3(quote.collateral)} <span className="unit">RIS3</span></span></div>
          <div className="qr"><span className="qk">debt owed</span><span className="qv">{formatEth(quote.debt, 4)} <span className="unit">Ξ</span></span></div>
          <div className="qr"><span className="qk">liq threshold (cv &lt;)</span><span className="qv red">{formatEth(quote.liquidationCv, 4)} <span className="unit">Ξ</span></span></div>
          <div className="qr"><span className="qk">min collateral (slip)</span><span className="qv">{formatRis3(minCollateral)} <span className="unit">RIS3</span></span></div>
        </div>
      )}

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className="action-btn" disabled={!canSubmit} onClick={onOpen}>
        {tooSmall ? `min 0.05 Ξ`
          : insufficient ? 'insufficient ETH'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : `Open ${leverage}× long`}
        {canSubmit && <span className="arrow">→</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}

// ───── positions ─────
function PositionsTab({ pool, address, slippage, configured, disabled }: any) {
  const chainId = DEFAULT_CHAIN_ID
  const hookAddress = hookAddressFor(chainId)
  const { positions, isLoading } = useUserPositions(address, chainId)
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const [closingId, setClosingId] = useState<bigint | null>(null)

  const onClose = (id: bigint, collateral: bigint, debt: bigint) => {
    if (!configured) return
    const closeQuote = quoteClose(pool.phantom, pool.curveTokens, collateral, debt)
    const minProceeds = applySlippage(closeQuote.toUser, slippage)
    setClosingId(id)
    reset()
    writeContract({
      address: hookAddress,
      abi: ris3HookAbi,
      functionName: 'closePosition',
      args: [id, minProceeds],
      chainId,
    })
  }

  if (!configured) {
    return <div className="empty-positions"><em>connect after v1.1 deploys to see positions</em></div>
  }

  if (isLoading) {
    return <div className="empty-positions">loading positions…</div>
  }

  if (positions.length === 0) {
    return <div className="empty-positions"><em>no open positions.</em><br /><br />open a leveraged position from the Open tab.</div>
  }

  return (
    <>
      <div className="positions-list">
        {positions.map(p => {
          const cv = collateralValueOf(pool.phantom, pool.curveTokens, p.collateral)
          const equity = equityOf(pool.phantom, pool.curveTokens, p.collateral, p.debt)
          const liq = isLiquidatable(pool.phantom, pool.curveTokens, p.collateral, p.debt)
          const threshold = (p.debt * 13000n) / 10000n
          const distancePct = cv > threshold ? Number(((cv - threshold) * 10000n) / (threshold || 1n)) / 100 : 0
          const warning = !liq && distancePct < 15
          const cardClass = liq ? 'liq' : warning ? 'warning' : ''
          const lev = p.debt > 0n ? Number((p.debt + (cv - p.debt)) * 100n / (cv - p.debt)) / 100 : 1

          return (
            <div className={`pos-card ${cardClass}`} key={String(p.id)}>
              <div className="id">#{String(p.id)}<span className="x">{lev.toFixed(0)}×</span></div>
              <div className="body">
                <div>
                  <div className="pk">collateral</div>
                  <div className="pv">{formatRis3(p.collateral, 0)} RIS3</div>
                </div>
                <div>
                  <div className="pk">debt</div>
                  <div className="pv">{formatEth(p.debt, 4)} Ξ</div>
                </div>
                <div>
                  <div className="pk">equity</div>
                  <div className={`pv ${equity > 0n ? 'grn' : 'red'}`}>{formatEth(equity, 4)} Ξ</div>
                </div>
              </div>
              <button
                className="close"
                onClick={() => onClose(p.id, p.collateral, p.debt)}
                disabled={disabled || (isPending && closingId === p.id) || (isConfirming && closingId === p.id)}
              >
                {closingId === p.id && isPending ? 'sign…'
                  : closingId === p.id && isConfirming ? 'closing…'
                  : 'close'}
              </button>
            </div>
          )
        })}
      </div>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}
