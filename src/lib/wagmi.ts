import { createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'
import { RPC_SEPOLIA, RPC_MAINNET, WALLETCONNECT_PROJECT_ID } from './config'

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [sepolia, mainnet],
    transports: {
      [sepolia.id]: http(RPC_SEPOLIA),
      [mainnet.id]: http(RPC_MAINNET),
    },
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
    appName: '$RIS3',
    appDescription: 'Long the curve. Up to 3x.',
    appUrl: 'https://ris3.xyz',
  })
)

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
