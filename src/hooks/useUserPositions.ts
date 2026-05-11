import { useMemo } from 'react'
  import { useReadContract, useReadContracts } from 'wagmi'
  import { hookAddressFor } from '../lib/config'
  import { riseHookAbi } from '../abi/RiseLeverageHook'
  
  export interface UserPosition {
    id: bigint
    owner: `0x${string}`
    openBlock: bigint
    leverageTier: number
    collateral: bigint
    debt: bigint
  }

  /**
   * Enumerates all positions on the hook from id=1 up to nextPositionId(),
   * keeps the ones owned by `address`. Cheap for small total-position counts
   * (a few hundred). For thousands of positions, replace with subgraph/event
   * indexing.
   */
  export function useUserPositions(address: `0x${string}` | undefined, chainId: number) {
    const hookAddress = hookAddressFor(chainId)

    const { data: nextIdData, isLoading: isLoadingNext, isError: isErrorNext } = useReadContract({
      address: hookAddress,
      abi: riseHookAbi,
      functionName: 'nextPositionId',
      chainId,
      query: { refetchInterval: 12_000 },
    })

    const nextId = (nextIdData as bigint | undefined) ?? 1n

    const contracts = useMemo(() => {
      const list: any[] = []
      for (let i = 1n; i < nextId; i++) {
        list.push({
          address: hookAddress,
          abi: riseHookAbi,
          functionName: 'getPosition',
          args: [i],
          chainId,
        })
      }
      return list
    }, [nextId, hookAddress, chainId])

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
        const p = r.result as {
          owner: `0x${string}`
          openBlock: bigint
          leverageTier: number
          collateral: bigint
          debt: bigint
        }
        if (!p.owner || p.owner === '0x0000000000000000000000000000000000000000') return
        if (p.owner.toLowerCase() !== me) return
        out.push({
          id: BigInt(idx + 1),
          owner: p.owner,
          openBlock: p.openBlock,
          leverageTier: Number(p.leverageTier),
          collateral: p.collateral,
          debt: p.debt,
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