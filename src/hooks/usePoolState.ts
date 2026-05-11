import { useReadContracts } from 'wagmi'
import { riseHookAbi } from '../abi/RiseLeverageHook'
import { hookAddressFor, isHookConfigured, DEFAULT_CHAIN_ID } from '../lib/config'
import { phantomEth, spotPrice } from '../lib/curve'

/**
 * usePoolState — reads the current pool state from the hook.
 * Polls every 12 seconds (configured in main.tsx QueryClient).
 *
 * Returns: realETH, totalDebt, curveTokens, redemptionTokens, liquidationDeficit,
 *          protocolFees, plus derived values (phantomEth, spotPrice, debtHeadroom).
 *
 * Falls back to zeroes if the hook isn't configured (placeholder address).
 */
export function usePoolState(chainId: number = DEFAULT_CHAIN_ID) {
  const hookAddress = hookAddressFor(chainId)
  const configured = isHookConfigured(chainId)

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: configured
      ? [
          { address: hookAddress, abi: riseHookAbi, functionName: 'realETH', chainId },
          { address: hookAddress, abi: riseHookAbi, functionName: 'totalDebt', chainId },
          { address: hookAddress, abi: riseHookAbi, functionName: 'curveTokens', chainId },
          { address: hookAddress, abi: riseHookAbi, functionName: 'redemptionTokens', chainId },
          { address: hookAddress, abi: riseHookAbi, functionName: 'liquidationDeficit', chainId },
          { address: hookAddress, abi: riseHookAbi, functionName: 'protocolFees', chainId },
          { address: hookAddress, abi: riseHookAbi, functionName: 'nextPositionId', chainId },
        ]
      : [],
    query: {
      enabled: configured,
      refetchInterval: 12_000,
    },
  })

  const realETH = (data?.[0]?.result as bigint | undefined) ?? 0n
  const totalDebt = (data?.[1]?.result as bigint | undefined) ?? 0n
  const curveTokens = (data?.[2]?.result as bigint | undefined) ?? 0n
  const redemptionTokens = (data?.[3]?.result as bigint | undefined) ?? 0n
  const liquidationDeficit = (data?.[4]?.result as bigint | undefined) ?? 0n
  const protocolFees = (data?.[5]?.result as bigint | undefined) ?? 0n
  const nextPositionId = (data?.[6]?.result as bigint | undefined) ?? 0n

  const phantom = phantomEth(realETH, totalDebt, liquidationDeficit)
  const spot = spotPrice(phantom, curveTokens)

  // global debt cap = 40% of (realETH + V) = 40% of (realETH + 20 ETH)
  const debtCap = ((realETH + 20n * 10n ** 18n) * 4000n) / 10000n
  const debtHeadroom = debtCap > totalDebt ? debtCap - totalDebt : 0n

  return {
    realETH,
    totalDebt,
    curveTokens,
    redemptionTokens,
    liquidationDeficit,
    protocolFees,
    nextPositionId,
    phantom,
    spot,
    debtCap,
    debtHeadroom,
    isLoading,
    error,
    configured,
    refetch,
  }
}
