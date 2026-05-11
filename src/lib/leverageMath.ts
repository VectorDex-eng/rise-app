import { formatEther } from 'viem';

  const toEth = (wei: bigint) => Number(formatEther(wei));

  // must match the contract: LIQ_THRESHOLD_BPS = 13000 → 130%
  const LIQ_THRESHOLD = 1.3;
  const SWAP_FEE_BPS = 50;

  export function quoteLeveragedOpen(
    phantomEthWei: bigint,
    curveTokensWei: bigint,
    ethCollateralWei: bigint,
    leverage: 2 | 3,
  ) {
    const phEth   = toEth(phantomEthWei);
    const tokens  = toEth(curveTokensWei);
    const E       = toEth(ethCollateralWei);

    // 2x: debt=E (notional 2E). 3x: debt=2E (notional 3E).
    const debt        = E * (leverage - 1);
    const totalEth    = E + debt;
    const ethAfterFee = totalEth * (1 - SWAP_FEE_BPS / 10000);

    // x*y = K curve move
    const k           = phEth * tokens;
    const phEthAfter  = phEth + ethAfterFee;
    const tokensAfter = k / phEthAfter;
    const tokensOut   = tokens - tokensAfter;       // collateral tokens

    const entryAvg   = totalEth / tokensOut;        // ETH / RISE
    const spotAfter  = phEthAfter / tokensAfter;    // marginal price post-entry
    const liqPrice   = (debt * LIQ_THRESHOLD) / tokensOut;
    const liqDropPct = (1 - liqPrice / spotAfter) * 100;

    return { tokensOut, debt, entryAvg, spotAfter, liqPrice, liqDropPct };
  }