// Minimal ABI for Ris3LeverageVaultV2 — only the surface the frontend needs.
export const ris3VaultAbi = [
  // ─── reads ───
  {
    name: 'owner', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'address' }],
  },
  {
    name: 'treasuryEth', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalDebt', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }],
  },
  {
    name: 'availableTreasury', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }],
  },
  {
    name: 'nextPositionId', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }],
  },
  {
    name: 'positions', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'openBlock', type: 'uint64' },
      { name: 'collateral', type: 'uint128' },
      { name: 'debt', type: 'uint128' },
    ],
  },
  {
    name: 'LIQ_THRESHOLD_BPS', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }],
  },
  {
    name: 'OPEN_FEE_BPS', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }],
  },
  // ─── writes ───
  {
    name: 'open', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'leverage', type: 'uint8' },
      { name: 'minCollateral', type: 'uint256' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'close', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'minProceeds', type: 'uint256' },
    ],
    outputs: [{ name: 'toUser', type: 'uint256' }],
  },
  {
    name: 'liquidate', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: 'bounty', type: 'uint256' }],
  },
  {
    name: 'depositTreasury', type: 'function', stateMutability: 'payable',
    inputs: [], outputs: [],
  },
  {
    name: 'withdrawTreasury', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [],
  },
  {
    name: 'sync', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  // ─── events ───
  {
    name: 'Opened', type: 'event', anonymous: false,
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'collateral', type: 'uint128', indexed: false },
      { name: 'debt', type: 'uint128', indexed: false },
      { name: 'fee', type: 'uint128', indexed: false },
    ],
  },
  {
    name: 'Closed', type: 'event', anonymous: false,
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'proceeds', type: 'uint256', indexed: false },
      { name: 'toUser', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Liquidated', type: 'event', anonymous: false,
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'liquidator', type: 'address', indexed: true },
      { name: 'proceeds', type: 'uint256', indexed: false },
      { name: 'bounty', type: 'uint256', indexed: false },
    ],
  },
] as const
