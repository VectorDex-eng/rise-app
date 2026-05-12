// Minimal V4 PoolManager ABI for reading pool state via extsload-backed views.
// Note: V4's StateLibrary works off PoolManager.extsload(). For simplicity here we surface the
// extsload getter and rely on viem/wagmi to call manager methods we need. This file currently
// exposes just extsload + getSlot0 if we need it.
export const poolManagerAbi = [
  {
    name: 'extsload',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'slot', type: 'bytes32' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'extsload',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'startSlot', type: 'bytes32' },
      { name: 'nSlots', type: 'uint256' },
    ],
    outputs: [{ type: 'bytes32[]' }],
  },
] as const
