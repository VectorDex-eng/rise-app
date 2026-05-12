// Minimal Universal Router ABI — execute(commands, inputs, deadline).
// V4_SWAP command (0x10) carries (actions, params) encoded as bytes.
export const universalRouterAbi = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const
