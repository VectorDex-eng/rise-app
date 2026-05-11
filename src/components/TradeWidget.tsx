import { useState, useMemo, useEffect } from 'react'
  import { useAccount, useBalance, useChainId, useReadContract, useWatchAsset, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
  import { ConnectKitButton } from 'connectkit'
import { useQueryClient } from '@tanstack/react-query'
  import { riseHookAbi } from '../abi/RiseLeverageHook'
import { riseTokenAbi } from '../abi/RiseToken'
import { poolSwapTestAbi } from '../abi/PoolSwapTest'
  import {
    hookAddressFor,
    isHookConfigured,
    chainName,
    DEFAULT_CHAIN_ID,
    SLIPPAGE_PRESETS,
    DEFAULT_SLIPPAGE_BPS,
    MIN_POSITION,
    LEVERAGE_TIERS,
  RISE_TOKEN_ADDRESS_SEPOLIA,
  POOL_SWAP_TEST_SEPOLIA,
  } from '../lib/config'
  import {
    quoteBuyGross,
    quoteSellGross,
    quoteOpen,
    quoteClose,
    applySlippage,
    applyFee,
    formatEth,
    formatRise,
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
  const { watchAsset } = useWatchAsset()
  const addRiseToWallet = () => watchAsset({ type: 'ERC20', options: { address: RISE_TOKEN_ADDRESS_SEPOLIA, symbol: 'RISE', decimals: 18 } })

    const pool = usePoolState(targetChainId)
    const configured = isHookConfigured(targetChainId)

    const [tab, setTab] = useState<Tab>('mint')
    const [slippage, setSlippage] = useState<bigint>(DEFAULT_SLIPPAGE_BPS)

    return (
      <div className="widget">
        <div className="widget-head">
          <div className="widget-pair">
            RISE <span className="slash">/</span> ETH
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
  const queryClient = useQueryClient()
  useEffect(() => { if (isSuccess) queryClient.invalidateQueries() }, [isSuccess, queryClient])

    const onMint = () => {
      if (!ethIn || !configured) return
      writeContract({ address: POOL_SWAP_TEST_SEPOLIA, abi: poolSwapTestAbi, functionName: 'swap', args: [{ currency0: 
  '0x0000000000000000000000000000000000000000', currency1: RISE_TOKEN_ADDRESS_SEPOLIA, fee: 10000, tickSpacing: 60, hooks: hookAddress }, { zeroForOne: true, amountSpecified: -ethIn, sqrtPriceLimitX96: 4295128740n }, { takeClaims: false, settleUsingBurn: false }, '0x'], value: ethIn, chainId })
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
          <div className="qr"><span className="qk">you receive (est.)</span><span className="qv">{formatRise(netOut)} <span className="unit">RISE</span></span></div>
          <div className="qr"><span className="qk">min after slippage</span><span className="qv">{formatRise(minOut)} <span className="unit">RISE</span></span></div>
          <div className="qr"><span className="qk">swap fee (50 bps)</span><span className="qv">{formatRise(grossOut - netOut, 4)} <span className="unit">RISE</span>
        <button className="add-mm" onClick={addRiseToWallet} title="Add RISE to MetaMask">+ RISE</button></span></div>
        </div>

        <SlippageRow value={slippage} onChange={setSlippage} />

        <button className="action-btn" disabled={!canSubmit} onClick={onMint}>
          {tooSmall ? 'amount too small'
            : insufficient ? 'insufficient ETH'
            : isPending ? 'sign in wallet…'
            : isConfirming ? 'confirming…'
            : 'Mint RISE'}
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

  const { data: _rb } = useReadContract({ address: RISE_TOKEN_ADDRESS_SEPOLIA, abi: riseTokenAbi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId, query: { enabled: !!address } })
  const riseBalance = ((_rb ?? 0n) as bigint)

  const { data: _al, refetch: refetchAllowance } = useReadContract({ address: RISE_TOKEN_ADDRESS_SEPOLIA, abi: riseTokenAbi, functionName: 'allowance', args: address ? [address, POOL_SWAP_TEST_SEPOLIA] : undefined, chainId, query: { enabled: !!address } })
  const allowance = ((_al ?? 0n) as bigint)

  const riseIn = useMemo(() => parseEth(input), [input])
  const grossOut = useMemo(() => {
    if (!riseIn || riseIn === 0n) return 0n
    return quoteSellGross(pool.phantom, pool.curveTokens, riseIn)
  }, [riseIn, pool.phantom, pool.curveTokens])
  const netOut = useMemo(() => applyFee(grossOut), [grossOut])
  const minOut = useMemo(() => applySlippage(netOut, slippage), [netOut, slippage])

  const needsApprove = riseIn !== null && riseIn > 0n && allowance < riseIn

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const queryClient = useQueryClient()
  useEffect(() => { if (isSuccess) queryClient.invalidateQueries() }, [isSuccess, queryClient])

  // After a successful approve, refresh the allowance so the button flips to "Burn".
  useEffect(() => { if (isSuccess) refetchAllowance() }, [isSuccess, refetchAllowance])

  const onApprove = () => {
    writeContract({
      address: RISE_TOKEN_ADDRESS_SEPOLIA,
      abi: riseTokenAbi,
      functionName: 'approve',
      args: [POOL_SWAP_TEST_SEPOLIA, (2n ** 256n - 1n)],
      chainId,
    })
  }

  const onBurn = () => {
    if (!riseIn || !configured) return
    writeContract({
      address: POOL_SWAP_TEST_SEPOLIA,
      abi: poolSwapTestAbi,
      functionName: 'swap',
      args: [
        { currency0: '0x0000000000000000000000000000000000000000', currency1: RISE_TOKEN_ADDRESS_SEPOLIA, fee: 10000, tickSpacing: 60, hooks: hookAddress },
        { zeroForOne: false, amountSpecified: -riseIn, sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970341n },
        { takeClaims: false, settleUsingBurn: false },
        '0x',
      ],
      chainId,
    })
  }

  const tooSmall = riseIn !== null && riseIn > 0n && riseIn < 10n ** 14n
  const insufficient = riseIn !== null && riseIn > riseBalance
  const canSubmit = !disabled && configured && riseIn !== null && riseIn > 0n && !tooSmall && !insufficient && !isPending && !isConfirming

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
        <div className="denom">RISE</div>
      </div>
      <div className="input-aux">
        <span className="balance">balance <strong>{formatRise(riseBalance, 2)}</strong> RISE</span>
        <button className="max" onClick={() => setInput(formatRise(riseBalance, 6))}>MAX</button>
      </div>

      <div className="quote">
        <div className="qr"><span className="qk">you receive (est.)</span><span className="qv">{formatEth(netOut, 6)} <span className="unit">ETH</span></span></div>
        <div className="qr"><span className="qk">min after slippage</span><span className="qv">{formatEth(minOut, 6)} <span className="unit">ETH</span></span></div>
        <div className="qr"><span className="qk">swap fee (50 bps)</span><span className="qv">{formatEth(grossOut - netOut, 6)} <span className="unit">ETH</span>
        <button className="add-mm" onClick={addRiseToWallet} title="Add RISE to MetaMask">+ RISE</button></span></div>
      </div>

      <SlippageRow value={slippage} onChange={setSlippage} />

      <button className="action-btn" disabled={!canSubmit} onClick={needsApprove ? onApprove : onBurn}>
        {tooSmall ? 'amount too small'
          : insufficient ? 'insufficient RISE'
          : isPending ? 'sign in wallet…'
          : isConfirming ? 'confirming…'
          : needsApprove ? 'Approve RISE'
          : 'Burn RISE'}
        {canSubmit && <span className="arrow">→</span>}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} chainId={chainId} />
    </>
  )
}


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

    const priceQuote = useMemo(() => {
      if (!quote || quote.collateral === 0n) return null
      const entryEth   = Number(quote.curveImpact)   / 1e18
      const tokens     = Number(quote.collateral)    / 1e18
      const liqCv      = Number(quote.liquidationCv) / 1e18
      const entryPrice = entryEth / tokens                    // ETH per RISE (avg paid)
      const liqPrice   = liqCv    / tokens                    // ETH per RISE at which liq triggers
      const liqDropPct = entryPrice > 0 ? (1 - liqPrice / entryPrice) * 100 : 0
      return { entryPrice, liqPrice, liqDropPct }
    }, [quote])

    const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const queryClient = useQueryClient()
  useEffect(() => { if (isSuccess) queryClient.invalidateQueries() }, [isSuccess, queryClient])

    const onOpen = () => {
      if (!ethIn || !configured) return
      writeContract({
        address: hookAddress,
        abi: riseHookAbi,
        functionName: 'openLeveragedPosition',
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
            <div className="qr"><span className="qk">entry price</span><span className="qv">{priceQuote ? priceQuote.entryPrice.toExponential(3) : '—'} <span className="unit">Ξ/RISE</span></span></div>
            <div className="qr"><span className="qk">collateral locked</span><span className="qv">{formatRise(quote.collateral)} <span className="unit">RISE</span></span></div>
            <div className="qr"><span className="qk">debt owed</span><span className="qv">{formatEth(quote.debt, 4)} <span className="unit">Ξ</span></span></div>
            <div className="qr"><span className="qk">liq price</span><span className="qv red">{priceQuote ? priceQuote.liqPrice.toExponential(3) : '—'} <span className="unit">Ξ/RISE</span></span></div>
            <div className="qr"><span className="qk">drop to liq</span><span className="qv red">{priceQuote ? priceQuote.liqDropPct.toFixed(1) + '%' : '—'}</span></div>
            <div className="qr"><span className="qk">liq threshold (cv &lt;)</span><span className="qv red">{formatEth(quote.liquidationCv, 4)} <span className="unit">Ξ</span></span></div>
            <div className="qr"><span className="qk">min collateral (slip)</span><span className="qv">{formatRise(minCollateral)} <span className="unit">RISE</span>
        <button className="add-mm" onClick={addRiseToWallet} title="Add RISE to MetaMask">+ RISE</button></span></div>
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
  const queryClient = useQueryClient()
  useEffect(() => { if (isSuccess) queryClient.invalidateQueries() }, [isSuccess, queryClient])
    const [closingId, setClosingId] = useState<bigint | null>(null)

    const onClose = (id: bigint, collateral: bigint, debt: bigint) => {
      if (!configured) return
      const closeQuote = quoteClose(pool.phantom, pool.curveTokens, collateral, debt)
      const minProceeds = applySlippage(closeQuote.toUser, slippage)
      setClosingId(id)
      reset()
      writeContract({
        address: hookAddress,
        abi: riseHookAbi,
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
                    <div className="pv">{formatRise(p.collateral, 0)} RISE</div>
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
