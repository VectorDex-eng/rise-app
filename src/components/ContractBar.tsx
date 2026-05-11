import { hookAddressFor, isHookConfigured, chainName, DEFAULT_CHAIN_ID } from '../lib/config'

export function ContractBar() {
  const chainId = DEFAULT_CHAIN_ID
  const addr = hookAddressFor(chainId)
  const configured = isHookConfigured(chainId)
  const explorer = chainId === 1
    ? `https://etherscan.io/address/${addr}`
    : `https://sepolia.etherscan.io/address/${addr}`

  return (
    <div className="contract-bar" id="contract">
      <div className="contract-inner">
        <div className="l">
          contract
          <span className="status">{configured ? `live · ${chainName(chainId)}` : 'awaiting v1.1 redeploy'}</span>
        </div>
        <div className="addr">{configured ? addr : '0x... (will populate after v1.1 deploys to ' + chainName(chainId) + ')'}</div>
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
