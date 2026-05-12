import { isHookConfigured, chainName, DEFAULT_CHAIN_ID, riseTokenAddressFor } from '../lib/config'

export function ContractBar() {
  const chainId = DEFAULT_CHAIN_ID
  const addr = riseTokenAddressFor(chainId)
  const configured = isHookConfigured(chainId)
  const explorer = chainId === 1
    ? `https://etherscan.io/address/${addr}`
    : `https://sepolia.etherscan.io/address/${addr}`

  const copy = () => {
    if (configured) navigator.clipboard?.writeText(addr).catch(() => {})
  }

  return (
    <div className="contract-bar" id="contract">
      <div className="contract-inner">
        <div className="l">
          contract
          <span className="status">{configured ? `live · ${chainName(chainId)}` : 'awaiting deploy'}</span>
        </div>
        <div className="addr" onClick={copy} title={configured ? 'click to copy' : ''} style={{ cursor: configured ? 'pointer' : 'default' }}>
          {configured ? addr : '0x... (will populate after deploy to ' + chainName(chainId) + ')'}
        </div>
        <div className="actions">
          {configured && (
            <a href={explorer} target="_blank" rel="noopener noreferrer">read source ↗</a>
          )}
          <a href="/paper.html">yellow paper ↗</a>
        </div>
      </div>
    </div>
  )
}
