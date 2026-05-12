import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'
import { RPC_MAINNET, WALLETCONNECT_PROJECT_ID } from './config'

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(RPC_MAINNET),
    },
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
    appName: '$RIS3',
    appDescription: 'Long. Levered. Onchain.',
    appUrl: 'https://ris3.xyz',
  })
)

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
