import { useReadContract, useReadContracts } from 'wagmi'
import { useMemo } from 'react'
import { ris3HookAbi } from '../abi/Ris3LeverageHook'
import { hookAddressFor, isHookConfigured, DEFAULT_CHAIN_ID } from '../lib/config'

export type Position = {
  id: bigint
  owner: `0x${string}`
  collateral: bigint
  debt: bigint
  openBlock: bigint
}

/**
 * useUserPositions — fetches all open positions for an owner.
 *
 *   1. positionsOf(owner) returns uint256[]
 *   2. for each ID, positions(id) returns the struct
 */
export function useUserPositions(owner: `0x${string}` | undefined, chainId: number = DEFAULT_CHAIN_ID) {
  const hookAddress = hookAddressFor(chainId)
  const configured = isHookConfigured(chainId)

  const { data: idsData, isLoading: loadingIds } = useReadContract({
    address: hookAddress,
    abi: ris3HookAbi,
    functionName: 'positionsOf',
    args: owner ? [owner] : undefined,
    chainId,
    query: { enabled: configured && !!owner, refetchInterval: 12_000 },
  })

  const ids = (idsData as bigint[] | undefined) ?? []

  const { data: positionsData, isLoading: loadingPositions } = useReadContracts({
    contracts: ids.map(id => ({
      address: hookAddress,
      abi: ris3HookAbi,
      functionName: 'positions' as const,
      args: [id] as const,
      chainId,
    })),
    query: { enabled: configured && ids.length > 0, refetchInterval: 12_000 },
  })

  const positions = useMemo<Position[]>(() => {
    if (!positionsData) return []
    return ids
      .map((id, idx) => {
        const r = positionsData[idx]?.result as
          | readonly [`0x${string}`, bigint, bigint, bigint]
          | undefined
        if (!r) return null
        const [pOwner, collateral, debt, openBlock] = r
        if (collateral === 0n && debt === 0n) return null // closed
        return { id, owner: pOwner, collateral, debt, openBlock }
      })
      .filter((p): p is Position => p !== null)
  }, [ids, positionsData])

  return {
    positions,
    isLoading: loadingIds || loadingPositions,
  }
}
