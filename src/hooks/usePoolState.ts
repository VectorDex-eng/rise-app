import { useReadContracts } from 'wagmi'
import { ris3VaultAbi } from '../abi/Ris3Vault'
import { ris3VaultFor, isConfigured, DEFAULT_CHAIN_ID } from '../lib/config'

/**
 * usePoolState — reads vault state (treasury, debt, positions count).
 *
 * NOTE: Live pool price (sqrtPriceX96, tick) is NOT read here. The frontend defers to
 * DEXScreener for displayed price/FDV. For internal computations the widget reads
 * spot price as needed via Universal Router quoter calls.
 */
export function usePoolState(chainId: number = DEFAULT_CHAIN_ID) {
  const vault = ris3VaultFor(chainId)
  const ready = isConfigured(chainId)

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: ready
      ? [
          { address: vault, abi: ris3VaultAbi, functionName: 'treasuryEth', chainId },
          { address: vault, abi: ris3VaultAbi, functionName: 'totalDebt', chainId },
          { address: vault, abi: ris3VaultAbi, functionName: 'availableTreasury', chainId },
          { address: vault, abi: ris3VaultAbi, functionName: 'nextPositionId', chainId },
        ]
      : [],
    query: {
      enabled: ready,
      refetchInterval: 12_000,
    },
  })

  const treasuryEth        = (data?.[0]?.result as bigint | undefined) ?? 0n
  const totalDebt          = (data?.[1]?.result as bigint | undefined) ?? 0n
  const availableTreasury  = (data?.[2]?.result as bigint | undefined) ?? 0n
  const nextPositionId     = (data?.[3]?.result as bigint | undefined) ?? 1n

  return {
    treasuryEth,
    totalDebt,
    availableTreasury,
    nextPositionId,
    isLoading,
    error,
    configured: ready,
    refetch,
    // Legacy aliases for old code paths (will be removed)
    realETH: treasuryEth,
    debtHeadroom: availableTreasury,
    phantom: 0n,
    spot: 0n,
    curveTokens: 0n,
  }
}
