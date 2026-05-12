import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { ris3VaultFor } from '../lib/config'
import { ris3VaultAbi } from '../abi/Ris3Vault'

export interface UserPosition {
  id: bigint
  owner: `0x${string}`
  openBlock: bigint
  collateral: bigint
  debt: bigint
  slSqrtPriceX96: bigint   // 0 = no SL
  tpSqrtPriceX96: bigint   // 0 = no TP
}

/**
 * Enumerate vault positions 1..nextPositionId-1, return those owned by `address`.
 * For very high position counts this should switch to an event-indexed approach.
 */
export function useUserPositions(address: `0x${string}` | undefined, chainId: number) {
  const vault = ris3VaultFor(chainId)

  const { data: nextIdData, isLoading: isLoadingNext, isError: isErrorNext } = useReadContract({
    address: vault,
    abi: ris3VaultAbi,
    functionName: 'nextPositionId',
    chainId,
    query: { refetchInterval: 12_000 },
  })

  const nextId = (nextIdData as bigint | undefined) ?? 1n

  const contracts = useMemo(() => {
    const list: any[] = []
    for (let i = 1n; i < nextId; i++) {
      list.push({
        address: vault,
        abi: ris3VaultAbi,
        functionName: 'positions',
        args: [i],
        chainId,
      })
    }
    return list
  }, [nextId, vault, chainId])

  const { data: rawPositions, isLoading: isLoadingPositions, isError: isErrorPositions } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0, refetchInterval: 12_000 },
  })

  const positions = useMemo<UserPosition[]>(() => {
    if (!address || !rawPositions) return []
    const me = address.toLowerCase()
    const out: UserPosition[] = []
    rawPositions.forEach((r, idx) => {
      if (r.status !== 'success' || !r.result) return
      // V13 vault.positions returns (owner, openBlock, collateral, debt, slSqrtPriceX96, tpSqrtPriceX96)
      const tuple = r.result as readonly [`0x${string}`, bigint, bigint, bigint, bigint, bigint]
      const [owner, openBlock, collateral, debt, slSqrtPriceX96, tpSqrtPriceX96] = tuple
      if (!owner || owner === '0x0000000000000000000000000000000000000000') return
      if (owner.toLowerCase() !== me) return
      out.push({
        id: BigInt(idx + 1),
        owner,
        openBlock: BigInt(openBlock),
        collateral: BigInt(collateral),
        debt: BigInt(debt),
        slSqrtPriceX96: BigInt(slSqrtPriceX96),
        tpSqrtPriceX96: BigInt(tpSqrtPriceX96),
      })
    })
    return out
  }, [rawPositions, address])

  return {
    positions,
    isLoading: isLoadingNext || isLoadingPositions,
    isError: isErrorNext || isErrorPositions,
  }
}
