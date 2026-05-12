import { SectHead, Reveal } from './SectHead'
import {
  RIS3_TOKEN_MAINNET, RIS3_VAULT_MAINNET, RIS3_HOOK_MAINNET,
  POOL_MANAGER_MAINNET, UNIVERSAL_ROUTER_MAINNET,
} from '../../lib/config'

export function Stack() {
  return (
    <section data-num="04" style={{ padding: '80px 0' }}>
      <div className="shell">
        <SectHead num="04" label="the stack" numLabel="04">
          <em>Three contracts.</em> All immutable. <span className="acc">All on Etherscan.</span>
          <div className="sect-sub">
            ris3 is open-source. The three deployed contracts have no admin keys, no upgradability, no
            pause function. The only privileged action is the vault owner depositing or withdrawing
            their own ETH treasury (and only the portion not currently lent out).
          </div>
        </SectHead>

        <div className="sect-body">
          <Reveal>
            <div className="stack-grid">
              <StackCard
                role="token"
                title="Ris3Token"
                addr={RIS3_TOKEN_MAINNET}
                points={[
                  'OZ ERC20 fixed supply 1M',
                  'No transfer hooks, no admin',
                  'Mints all supply to deployer at construction',
                ]}
              />
              <StackCard
                role="hook"
                title="Ris3EthFeeHook"
                addr={RIS3_HOOK_MAINNET}
                points={[
                  'V4 hook with BEFORE/AFTER_SWAP only',
                  'Skims 1% ETH on every swap → vault',
                  'Does NOT override swap math (real LP)',
                ]}
              />
              <StackCard
                role="vault"
                title="Ris3LeverageVaultV2"
                addr={RIS3_VAULT_MAINNET}
                points={[
                  'Treasury-backed 2× / 3× leverage',
                  'open / close / liquidate / sync',
                  'Owner can deposit + withdraw treasury',
                ]}
              />
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="stack-infra">
              <div className="infra-kicker">Uniswap V4 infra (canonical mainnet)</div>
              <div className="infra-row">
                <span className="infra-k">PoolManager</span>
                <a className="infra-v" href={`https://etherscan.io/address/${POOL_MANAGER_MAINNET}`} target="_blank" rel="noopener noreferrer">{shortAddr(POOL_MANAGER_MAINNET)} ↗</a>
              </div>
              <div className="infra-row">
                <span className="infra-k">UniversalRouter</span>
                <a className="infra-v" href={`https://etherscan.io/address/${UNIVERSAL_ROUTER_MAINNET}`} target="_blank" rel="noopener noreferrer">{shortAddr(UNIVERSAL_ROUTER_MAINNET)} ↗</a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function StackCard({ role, title, addr, points }: { role: string; title: string; addr: string; points: string[] }) {
  return (
    <div className="stack-card">
      <div className="stack-role">{role}</div>
      <div className="stack-title">{title}</div>
      <a className="stack-addr" href={`https://etherscan.io/address/${addr}`} target="_blank" rel="noopener noreferrer">
        {shortAddr(addr)} ↗
      </a>
      <ul className="stack-points">
        {points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  )
}

function shortAddr(a: string): string {
  return `${a.slice(0, 8)}...${a.slice(-6)}`
}
