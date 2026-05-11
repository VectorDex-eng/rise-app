/**
 * Ris3LeverageHook ABI
 *
 * PLACEHOLDER — derived from the spec doc.
 * AFTER v1.1 redeploys, REPLACE this with the real ABI:
 *
 *   On the VPS:
 *   $ cd /root/ris3
 *   $ forge inspect Ris3LeverageHook abi > /tmp/hook.json
 *   $ cat /tmp/hook.json
 *
 *   Then paste it into the array below.
 *
 * The function names and signatures should match what's in the spec; if they
 * diverge, the real Foundry-generated ABI is the source of truth.
 */

export const ris3HookAbi = [
  // ── reads ───────────────────────────────────────────────
  {
    type: 'function',
    name: 'realETH',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'totalDebt',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'curveTokens',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'redemptionTokens',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'liquidationDeficit',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'protocolFees',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'positions',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'collateral', type: 'uint256' },
      { name: 'debt', type: 'uint256' },
      { name: 'openBlock', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'positionsOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256[]' }]
  },
  {
    type: 'function',
    name: 'nextPositionId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'isLiquidatable',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'collateralValue',
    stateMutability: 'view',
    inputs: [{ name: 'collateral', type: 'uint256' }],
    outputs: [{ type: 'uint256' }]
  },
  // ── writes ──────────────────────────────────────────────
  {
    type: 'function',
    name: 'openPosition',
    stateMutability: 'payable',
    inputs: [
      { name: 'leverage', type: 'uint8' },
      { name: 'minCollateral', type: 'uint256' }
    ],
    outputs: [{ name: 'id', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'closePosition',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'minProceeds', type: 'uint256' }
    ],
    outputs: [{ name: 'proceeds', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'liquidate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'transferPosition',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'to', type: 'address' }
    ],
    outputs: []
  },
  // ── events ──────────────────────────────────────────────
  {
    type: 'event',
    name: 'PositionOpened',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'leverage', type: 'uint8', indexed: false },
      { name: 'collateral', type: 'uint256', indexed: false },
      { name: 'debt', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'PositionClosed',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'proceeds', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'PositionLiquidated',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'liquidator', type: 'address', indexed: true },
      { name: 'bounty', type: 'uint256', indexed: false }
    ]
  }
] as const
